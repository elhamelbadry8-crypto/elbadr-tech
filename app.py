import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import jwt
from datetime import datetime, timedelta
from functools import wraps
import json
from dotenv import load_dotenv
import pytds
import os
# تحميل متغيرات البيئة من ملف .env
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-dev-secret-key-change-it')

CORS(app) 

# إعدادات الاتصال بقاعدة البيانات الجديدة
def get_db_connection():
    db_server = os.environ.get('DB_SERVER', 'db65017.public.databaseasp.net')
    db_name = os.environ.get('DB_NAME', 'db65017')
    db_user = os.environ.get('DB_USER', 'db65017')
    db_password = os.environ.get('DB_PASSWORD', 'J@w65X!qA%k9') 

    conn = pytds.connect(
        server=db_server,
        database=db_name,
        user=db_user,
        password=db_password,
        port=1433
    )
    return conn

# ==========================================
# 🔴 دالة حماية المسارات (JWT Middleware)
# ==========================================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({}), 200

        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]

        if not token:
            return jsonify({'error': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['customer_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401

        return f(current_user_id, *args, **kwargs)
    return decorated

@app.route('/')
def home():
    return "STORE API is running successfully!"

# ==========================================
# 1. مسار تسجيل حساب جديد (Sign Up)
# ==========================================
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not all([name, email, phone, password]):
        return jsonify({'error': 'Missing required fields'}), 400

    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT CUSTOMER_ID FROM CUSTOMER WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Email already exists'}), 400

        insert_query = """
        INSERT INTO CUSTOMER (name, email, phone, password_hash)
        VALUES (?, ?, ?, ?)
        """
        cursor.execute(insert_query, (name, email, phone, hashed_password))
        conn.commit()
        return jsonify({'message': 'Account created successfully!'}), 201

    except Exception as e:
        print("SIGNUP ERROR:", str(e))
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 2. مسار تسجيل الدخول (Login)
# ==========================================
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email') 
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Missing email or password'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT CUSTOMER_ID, password_hash FROM CUSTOMER WHERE email = ?", (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user[1], password):
            token_payload = {
                'customer_id': user[0],
                'exp': datetime.utcnow() + timedelta(hours=24) 
            }
            token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'message': 'Login successful', 
                'token': token, 
                'customer_id': user[0] 
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        print("LOGIN ERROR:", str(e))
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 3. مسار جلب المنتجات (Products / Catalog)
# ==========================================
@app.route('/api/product', methods=['GET'])
def get_product():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT 
                ProductID AS id, 
                ProductName AS name, 
                Brand AS brand, 
                StockQuantity AS stock, 
                SellingPrice1 AS price, 
                ImageUrl AS image,
                ItemFullName AS description,
                MainCategory AS maincategory
            FROM dbo.Products
        """
        cursor.execute(query)
        
        columns = [column[0].lower() for column in cursor.description]
        items = [dict(zip(columns, row)) for row in cursor.fetchall()]

        conn.close()
        return jsonify(items)
    except Exception as e:
        print('GET PRODUCT ERROR:', e)
        return jsonify({'error': str(e)}), 500

# ==========================================
# 4. مسار إتمام الطلب والدفع (Checkout)
# ==========================================
@app.route('/api/checkout', methods=['POST', 'OPTIONS'])
def process_checkout():
    if request.method == 'OPTIONS': return jsonify({}), 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data received'}), 400
        
        raw_customer_id = data.get('customer_id') 
        cart_items = data.get('cart_items', [])
        payment_method = data.get('payment_method') 
        delivery_address = data.get('delivery_address')
        
        subtotal = float(data.get('subtotal', 0))
        tax = float(data.get('tax', 0))
        total = float(data.get('total', 0))

        if not cart_items:
            return jsonify({'error': 'Cart is empty'}), 400

        customer_id = None
        if raw_customer_id and raw_customer_id != 'null':
            try: customer_id = int(raw_customer_id)
            except: pass

        txn_reference = None
        payment_status = 'pending'
        
        if payment_method == 'card':
            txn_reference = f"TXN-{uuid.uuid4().hex[:10].upper()}"
            payment_status = 'completed'
        else:
            payment_status = 'pending_cash'

        conn = get_db_connection()
        cursor = conn.cursor()
        
        if customer_id and delivery_address:
             cursor.execute("UPDATE CUSTOMER SET address = ? WHERE CUSTOMER_ID = ?", (delivery_address, customer_id))

        insert_order_query = """
            INSERT INTO [ORDER] (CUSTOMER_ID, status, subtotal, tax, delivery_fee, discount_amount, total, ordered_at)
            OUTPUT INSERTED.ORDER_ID
            VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())
        """
        cursor.execute(insert_order_query, (customer_id, 'New', subtotal, tax, 0, 0, total))
        order_id = cursor.fetchone()[0]

        for item in cart_items:
            product_id = int(item['id'])
            quantity = int(item['quantity'])
            unit_price = float(item['price'])

            insert_item_query = """
                INSERT INTO ORDER_ITEM (ORDER_ID, ProductID, quantity, unit_price)
                VALUES (?, ?, ?, ?)
            """
            cursor.execute(insert_item_query, (order_id, product_id, quantity, unit_price))

            update_prod_query = """
                UPDATE Products 
                SET StockQuantity = CASE WHEN StockQuantity >= ? THEN StockQuantity - ? ELSE 0 END,
                    SoldCount = ISNULL(SoldCount, 0) + ?
                WHERE ProductID = ?
            """
            cursor.execute(update_prod_query, (quantity, quantity, quantity, product_id))

        insert_payment_query = """
            INSERT INTO PAYMENT (ORDER_ID, method, amount, status, txn_reference, paid_at)
            VALUES (?, ?, ?, ?, ?, GETDATE())
        """
        cursor.execute(insert_payment_query, (order_id, payment_method, total, payment_status, txn_reference))

        receipt_number = f"REC-{datetime.now().strftime('%Y%m%d')}-{order_id}"
        insert_receipt_query = """
            INSERT INTO RECEIPT (ORDER_ID, receipt_number, issued_at)
            VALUES (?, ?, GETDATE())
        """
        cursor.execute(insert_receipt_query, (order_id, receipt_number))

        conn.commit() 

        return jsonify({
            'message': 'Order processed successfully!',
            'order_id': order_id,
            'receipt_number': receipt_number,
            'transaction_ref': txn_reference
        }), 201

    except Exception as e:
        if 'conn' in locals(): conn.rollback() 
        print("CHECKOUT ERROR:", str(e)) 
        return jsonify({'error': 'Failed to process checkout.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 5. مسار جلب بيانات الحساب (Account)
# ==========================================
@app.route('/api/account', methods=['GET'])
@token_required
def get_account(current_user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # تم تصحيح account_image إلى profile_image لتطابق قاعدة البيانات
        cursor.execute("SELECT name, email, phone, profile_image, address FROM CUSTOMER WHERE CUSTOMER_ID = ?", (current_user_id,))
        user_row = cursor.fetchone()
        
        if not user_row:
            return jsonify({'error': 'User not found'}), 404
            
        user_data = {
            'NAME': user_row[0], 'EMAIL': user_row[1], 'PHONE': user_row[2],
            'IMAGE': user_row[3], 'ADDRESS': user_row[4]
        }

        cursor.execute("""
            SELECT ORDER_ID AS ORD_ID, ordered_at AS ORD_DATE, total AS TOTAL_PRICE 
            FROM [ORDER] 
            WHERE CUSTOMER_ID = ? 
            ORDER BY ordered_at DESC
        """, (current_user_id,))
        
        columns = [column[0] for column in cursor.description]
        orders_data = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return jsonify({'user': user_data, 'orders': orders_data}), 200

    except Exception as e:
        print("GET ACCOUNT ERROR:", str(e))
        return jsonify({'error': 'Failed to load account.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 6. مسار تعديل بيانات الحساب (Update Account)
# ==========================================
@app.route('/api/account', methods=['PUT', 'OPTIONS'])
@token_required
def update_account(current_user_id):
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        data = request.get_json()
        name = data.get('name')
        phone = data.get('phone')
        account_image = data.get('account_image') # القادمة من الجافاسكريبت
        address = data.get('address')

        conn = get_db_connection()
        cursor = conn.cursor()

        # تم تصحيح account_image إلى profile_image في استعلام الـ SQL
        query = """
            UPDATE CUSTOMER 
            SET name = ?, phone = ?, profile_image = ?, address = ?, updated_at = GETDATE()
            WHERE CUSTOMER_ID = ?
        """
        cursor.execute(query, (name, phone, account_image, address, current_user_id))
        conn.commit()

        return jsonify({'message': 'Account updated successfully!'}), 200
    except Exception as e:
        print("UPDATE ACCOUNT ERROR:", str(e))
        return jsonify({'error': 'Failed to update account.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 7. مسار جلب أوردرات المستخدم (My Orders)
# ==========================================
@app.route('/api/my-orders', methods=['GET'])
@token_required
def get_user_orders(current_user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT ORDER_ID, status, total, ordered_at 
            FROM [ORDER]
            WHERE CUSTOMER_ID = ?
            ORDER BY ordered_at DESC
        """
        cursor.execute(query, (current_user_id,))
        
        orders = []
        for row in cursor.fetchall():
            orders.append({
                'id': row.ORDER_ID, 
                'status': row.status, 
                'totalPrice': float(row.total),
                'timestamp': row.ordered_at.timestamp() * 1000 if row.ordered_at else None,
                'mode': 'delivery'
            })

        return jsonify(orders), 200

    except Exception as e:
        print("GET ORDERS ERROR:", str(e))
        return jsonify({'error': 'Failed to load orders.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 8. مسار إضافة تقييم (Submit Review)
# ==========================================
@app.route('/api/feedback', methods=['POST', 'OPTIONS'])
@token_required
def submit_feedback(current_user_id):
    if request.method == 'OPTIONS': 
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        customer_id = current_user_id 
        raw_order_id = data.get('order_id')
        rating = data.get('rating')
        comment = data.get('comment', '')
        tags = data.get('tags', '')

        if not customer_id or not rating:
            return jsonify({'error': 'Customer ID and Rating are required'}), 400

        order_id = None
        if raw_order_id and str(raw_order_id).lower() not in ['nan', 'null', 'none', '']:
            try: 
                order_id = int(raw_order_id)
            except ValueError: 
                pass

        conn = get_db_connection()
        cursor = conn.cursor()

        # تم تصحيح اسم الجدول هنا ليكون [FEEDBACKS] ليطابق قاعدة البيانات تماماً
        insert_query = """
            INSERT INTO [FEEDBACKS] ([ORDER_ID], [CUSTOMER_ID], [rating], [comment], [tags], [created_at])
            VALUES (?, ?, ?, ?, ?, GETDATE())
        """
        cursor.execute(insert_query, (order_id, customer_id, rating, comment, tags))
        conn.commit()

        return jsonify({'message': 'Feedback submitted successfully!'}), 201

    except Exception as e:
        print("FEEDBACK ERROR:", str(e))
        return jsonify({'error': 'Failed to submit feedback.'}), 500
    finally:
        if 'conn' in locals(): 
            conn.close()
# ==========================================
# 9. مسار إلغاء الأوردر (Cancel Order)
# ==========================================
@app.route('/api/orders/<int:order_id>/cancel', methods=['PUT', 'OPTIONS'])
@token_required
def cancel_order(current_user_id, order_id):
    if request.method == 'OPTIONS': return jsonify({}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT CUSTOMER_ID FROM [ORDER] WHERE ORDER_ID = ? AND CUSTOMER_ID = ?", (order_id, current_user_id))
        order_info = cursor.fetchone()

        if not order_info:
             return jsonify({'error': 'Order not found or unauthorized.'}), 404

        update_query = "UPDATE [ORDER] SET status = 'Cancelled', updated_at = GETDATE() WHERE ORDER_ID = ?"
        cursor.execute(update_query, (order_id,))

        conn.commit()

        return jsonify({'message': 'Order cancelled successfully.', 'order_id': order_id}), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print("CANCEL ORDER ERROR:", str(e))
        return jsonify({'error': 'Failed to cancel order.'}), 500
    finally:
        if 'conn' in locals(): conn.close()

# ==========================================
# 10. مسار حذف الحساب (Delete Account)
# ==========================================
@app.route('/api/account', methods=['DELETE', 'OPTIONS'])
@token_required
def delete_account(current_user_id):
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        data = request.get_json()
        password = data.get('password')

        if not password:
            return jsonify({'error': 'Password is required to delete account'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT password_hash FROM CUSTOMER WHERE CUSTOMER_ID = ?", (current_user_id,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user[0], password):
            return jsonify({'error': 'Incorrect password. Account deletion failed.'}), 401

        cursor.execute("DELETE FROM CUSTOMER WHERE CUSTOMER_ID = ?", (current_user_id,))
        conn.commit()

        return jsonify({'message': 'Account deleted successfully'}), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print("DELETE ACCOUNT ERROR:", str(e))
        return jsonify({'error': 'Failed to delete account.'}), 500
    finally:
        if 'conn' in locals(): conn.close()
