const API_BASE_URL = 'http://127.0.0.1:5000/api';
const token = localStorage.getItem('jwtToken');

// ==========================================
// 1. تنظيف المدخلات للوقاية من هجمات XSS
// ==========================================
function escapeHTML(str) {
    if (!str) return str;
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // التحقق من الجلسة وزر التسجيل
    if (!token) {
        alert("Please login first to rate your orders.");
        window.location.href = "../login/login.html";
        return;
    }

    loadUserOrders();
});

// ==========================================
// 2. تسجيل الخروج
// ==========================================
window.logoutUser = function(event) {
    if (event) event.preventDefault(); 
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("customerId");
    localStorage.removeItem("customer_id"); 
    localStorage.removeItem("diningMode");
    window.location.href = "../home/home.html";
};

// ==========================================
// 3. جلب طلبات المستخدم من السيرفر
// ==========================================
async function loadUserOrders() {
    const selectElement = document.getElementById('orderSelect');
    try {
        const response = await fetch(`${API_BASE_URL}/my-orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            alert("Session expired. Please login again.");
            logoutUser();
            return;
        }

        const orders = await response.json();
        
        selectElement.innerHTML = '<option value="" disabled selected>Select an order...</option>';
        
        if (!orders || orders.length === 0) {
            selectElement.innerHTML = '<option value="" disabled>No previous orders found</option>';
            return;
        }

        orders.forEach(order => {
            const date = new Date(order.timestamp || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const option = document.createElement('option');
            option.value = order.id;
            option.text = `Order #${order.id} - ${date} (${order.totalPrice || 0} EGP)`;
            selectElement.appendChild(option);
        });
    } catch (err) {
        console.error("Error loading orders:", err);
        selectElement.innerHTML = '<option value="" disabled>Error loading orders</option>';
    }
}

// ==========================================
// 4. إرسال التقييم
// ==========================================
document.getElementById('feedbackForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const orderSelect = document.getElementById('orderSelect');
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const titleInput = document.getElementById('reviewTitle');
    const commentInput = document.getElementById('commentText');

    if (!orderSelect.value) {
        alert("Please select an order to rate.");
        return;
    }

    if (!ratingInput) {
        alert("Please select an overall rating (stars).");
        return;
    }

    const subEnergy = document.querySelector('input[name="sub_energy"]:checked')?.value || 0;
    const subQuality = document.querySelector('input[name="sub_quality"]:checked')?.value || 0;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting Review...';

    const safeTitle = escapeHTML(titleInput.value.trim());
    const safeComment = escapeHTML(commentInput.value.trim());
    
    const feedbackData = {
        order_id: parseInt(orderSelect.value),
        rating: parseInt(ratingInput.value),
        title: safeTitle,
        comment: safeComment,
        energy_rating: parseInt(subEnergy),
        quality_rating: parseInt(subQuality)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(feedbackData)
        });

        if (response.status === 401) {
            alert("Session expired. Please login again.");
            logoutUser();
            return;
        }

        const result = await response.json();

        if (response.ok) {
            alert('Feedback submitted successfully! Thank you for reviewing Elbadr Technology.');
            window.location.reload(); 
        } else {
            alert('Error: ' + (result.error || 'Please try again.'));
        }
    } catch (err) {
        console.error("Error submitting feedback:", err);
        alert('Connection error. Please make sure the server is running.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Review';
    }
});