const API_BASE_URL = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutData();
    setupPaymentMethods();
    prefillUserData();
});

function escapeHTML(str) {
    if (!str) return str;
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

function prefillUserData() {
    const savedName = localStorage.getItem('customer_name');
    const savedPhone = localStorage.getItem('customer_phone');
    const savedAddress = localStorage.getItem('customer_address');

    if (savedName && document.getElementById('shipping-name')) document.getElementById('shipping-name').value = savedName;
    if (savedPhone && document.getElementById('shipping-phone')) document.getElementById('shipping-phone').value = savedPhone;
    if (savedAddress && document.getElementById('shipping-address')) document.getElementById('shipping-address').value = savedAddress;
}

function loadCheckoutData() {
    const cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    let subtotal = 0;
    
    const itemsList = document.getElementById('checkout-items-list');
    if (itemsList) {
        if (cart.length === 0) {
            itemsList.innerHTML = '<p style="color:#7f8c8d; font-size:0.8rem;">Cart is empty</p>';
        } else {
            itemsList.innerHTML = '';
            cart.forEach(item => {
                subtotal += item.price * item.quantity;
                const row = `
                    <div class="mini-item-row">
                        <span>${escapeHTML(item.name)} (x${item.quantity})</span>
                        <strong>E£${(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                `;
                itemsList.insertAdjacentHTML('beforeend', row);
            });
        }
    }

    const tax = subtotal * 0.10;
    const total = subtotal + tax;

    const sumBtnText = document.getElementById('btn-sum-text');
    if (sumBtnText) {
        sumBtnText.innerText = `SUM: E£${total.toFixed(2)}`;
    }
}

function setupPaymentMethods() {
    const radios = document.querySelectorAll('input[name="payment"]');
    const ccForm = document.getElementById('card-details-form');
    const paypalForm = document.getElementById('paypal-details-form');
    
    if (radios.length > 0) {
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (ccForm) ccForm.classList.remove('show');
                if (paypalForm) paypalForm.classList.remove('show');

                if (e.target.value === 'card' && ccForm) {
                    ccForm.classList.add('show');
                } else if (e.target.value === 'paypal' && paypalForm) {
                    paypalForm.classList.add('show');
                }
            });
        });
    }
}

async function processPayment(buttonBtn) {
    const cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    if (cart.length === 0) {
        alert("Cart is empty! Add appliances first.");
        window.location.href = "../product/menu.html";
        return;
    }

    // جمع بيانات التوصيل والعنوان
    const shippingName = document.getElementById('shipping-name') ? document.getElementById('shipping-name').value.trim() : '';
    const shippingPhone = document.getElementById('shipping-phone') ? document.getElementById('shipping-phone').value.trim() : '';
    const shippingCity = document.getElementById('shipping-city') ? document.getElementById('shipping-city').value.trim() : '';
    const shippingAddress = document.getElementById('shipping-address') ? document.getElementById('shipping-address').value.trim() : '';

    if (!shippingName || !shippingPhone || !shippingAddress) {
        alert("Please fill in all required shipping address and contact fields.");
        return;
    }

    const paymentMethodObj = document.querySelector('input[name="payment"]:checked');
    const paymentMethod = paymentMethodObj ? paymentMethodObj.value : 'cash';
    
    let paymentDetails = {};
    if (paymentMethod === 'paypal') {
        const paypalEmail = document.getElementById('paypal-email').value.trim();
        if (!paypalEmail || !paypalEmail.includes('@')) {
            alert("Please enter a valid PayPal email address.");
            return;
        }
        paymentDetails.paypal_email = paypalEmail;
    }

    const notesField = document.getElementById('order-notes');
    const orderNotes = notesField ? escapeHTML(notesField.value.trim()) : '';

    let subtotal = 0;
    cart.forEach(item => subtotal += (parseFloat(item.price) * parseInt(item.quantity)));
    const tax = subtotal * 0.10;
    const totalWithTax = (subtotal + tax).toFixed(2);

    const token = localStorage.getItem('jwtToken');
    const customerId = localStorage.getItem('customer_id');

    buttonBtn.disabled = true;
    const spinner = buttonBtn.querySelector('.spinner');
    const btnTextSpan = buttonBtn.querySelector('.btn-text');
    if(spinner) spinner.style.display = 'block';
    if(btnTextSpan) btnTextSpan.style.display = 'none';

    const orderPayload = {
        customer_id: customerId,
        shipping_info: {
            name: escapeHTML(shippingName),
            phone: escapeHTML(shippingPhone),
            city: escapeHTML(shippingCity),
            address: escapeHTML(shippingAddress)
        },
        cart_items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        order_type: 'delivery',
        subtotal: subtotal,
        tax: tax,
        total: parseFloat(totalWithTax),
        notes: orderNotes
    };

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/checkout`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.removeItem('cartItems');
            localStorage.setItem('lastOrderID', result.order_id);
            localStorage.setItem('receiptNumber', result.receipt_number);
            
            alert('Order Placed Successfully! Order ID: ' + result.order_id);
            window.location.href = '../tracking/tracking.html'; 
        } else {
            alert('Order failed: ' + result.error);
            buttonBtn.disabled = false;
            if(spinner) spinner.style.display = 'none';
            if(btnTextSpan) btnTextSpan.style.display = 'inline';
        }

    } catch (error) {
        console.error("Error processing checkout:", error);
        alert('Server connection error.');
        buttonBtn.disabled = false;
        if(spinner) spinner.style.display = 'none';
        if(btnTextSpan) btnTextSpan.style.display = 'inline';
    }
}