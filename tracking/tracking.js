const API_BASE_URL = 'http://127.0.0.1:5000/api';
const token = localStorage.getItem('jwtToken');
const customerId = localStorage.getItem('customerId') || localStorage.getItem('customer_id');

document.addEventListener('DOMContentLoaded', () => {
    setupNavbarAuth();
    fetchUserOrders();

    setInterval(() => {
        if(token) fetchUserOrders();
    }, 30000);
});

function logoutUser(event) {
    if (event) event.preventDefault(); 
    localStorage.removeItem("jwtToken"); 
    localStorage.removeItem("customerId");
    localStorage.removeItem("customer_id"); 
    localStorage.removeItem("diningMode");
    window.location.href = "../home/home.html";
}

function setupNavbarAuth() {
    const authLink = document.getElementById('auth-link');
    const authText = document.getElementById('auth-text');

    if (token) {
        authText.innerText = "Account";
        authLink.href = "../account/account.html"; 
    } else {
        authText.innerText = "Login";
        authLink.href = "../login/login.html"; 
    }
}

async function fetchUserOrders() {
    if (!token) {
        const noMsg = document.getElementById('no-active-msg');
        noMsg.querySelector('h2').innerText = "Please login to view your orders.";
        noMsg.classList.remove('hidden');
        document.getElementById('orders-container').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/my-orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            alert("Your session has expired. Please login again.");
            logoutUser();
            return;
        }

        if (!response.ok) throw new Error('Failed to fetch');
        
        const allOrders = await response.json();
        
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0); 

        const activeOrders = allOrders.filter(o => {
            const status = o.status ? o.status.toLowerCase() : '';
            if (status === 'cancelled') return false; 
            
            const isCompleted = ['completed', 'done', 'delivered'].includes(status);
            const orderDate = new Date(o.ordered_at || o.timestamp); 
            
            if (isCompleted && orderDate.getTime() < todayMidnight.getTime()) {
                return false; 
            }
            return true; 
        });
        
        const historyOrders = allOrders.filter(o => {
            const status = o.status ? o.status.toLowerCase() : '';
            if (status === 'cancelled') return true; 
            
            const isCompleted = ['completed', 'done', 'delivered'].includes(status);
            const orderDate = new Date(o.ordered_at || o.timestamp);
            
            if (isCompleted && orderDate.getTime() < todayMidnight.getTime()) {
                return true; 
            }
            return false;
        });

        renderActiveOrders(activeOrders);
        renderHistory(historyOrders);

    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('active-view').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');

    if (tab === 'active') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('active-view').classList.remove('hidden');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('history-view').classList.remove('hidden');
    }
}

function renderActiveOrders(orders) {
    const container = document.getElementById('orders-container');
    const noMsg = document.getElementById('no-active-msg');

    container.innerHTML = '';

    if (orders.length === 0) {
        noMsg.classList.remove('hidden');
        return;
    }

    noMsg.classList.add('hidden');
    
    orders.forEach(order => {
        container.insertAdjacentHTML('beforeend', createOrderCard(order));
    });
}

function createOrderCard(order) {
    const stat = order.status ? order.status.toLowerCase() : '';
    const priceDisplay = `$${order.totalPrice || order.total}`;
    const orderId = order.id || order.ORDER_ID;

    let mainTitle = 'Ordered';
    let subTitle = 'Your order has been placed and is being processed.';

    if (['shipped', 'ready'].includes(stat)) {
        mainTitle = 'Shipped';
        subTitle = 'Package left the facility.';
    } else if (['on way', 'out for delivery'].includes(stat)) {
        mainTitle = 'Out for delivery';
        subTitle = 'Your order is on the way with courier.';
    } else if (['completed', 'done', 'delivered'].includes(stat)) {
        mainTitle = 'Delivered';
        subTitle = 'Package has been delivered successfully.';
    }

    const progressHTML = generateProgressBar(stat);

    let cancelBtn = (stat === 'new' || stat === 'payment' || stat === 'confirmed') ? 
        `<button class="btn-cancel" onclick="cancelOrder(${orderId})">Cancel Order</button>` : '';

    return `
    <div class="order-card" id="order-card-${orderId}">
        <div class="card-header-bar">
            <div class="order-id">
                <h3>Order #${orderId}</h3>
                <span>${priceDisplay}</span>
            </div>
        </div>

        <div class="card-body-content">
            <div class="tracking-status-header">
                <h3>${mainTitle}</h3>
                <p>${subTitle}</p>
            </div>

            <div class="progress-container">
                ${progressHTML}
            </div>
        </div>

        <div class="card-footer-bar">
            ${cancelBtn}
        </div>
    </div>
    `;
}

function generateProgressBar(stat) {
    if (stat === 'payment') stat = 'new';

    let s1 = 'p-step';
    let s2 = 'p-step';
    let s3 = 'p-step';
    let s4 = 'p-step';
    let fillWidth = '0%';

    if (['new', 'confirmed', 'preparing'].includes(stat) || !stat) {
        s1 = 'p-step active';
        fillWidth = '0%';
    } 
    else if (['shipped', 'ready'].includes(stat)) {
        s1 = 'p-step completed';
        s2 = 'p-step active';
        fillWidth = '33.33%';
    } 
    else if (['on way', 'out for delivery'].includes(stat)) {
        s1 = 'p-step completed';
        s2 = 'p-step completed';
        s3 = 'p-step active';
        fillWidth = '66.66%';
    } 
    else if (['completed', 'done', 'delivered'].includes(stat)) {
        s1 = 'p-step completed';
        s2 = 'p-step completed';
        s3 = 'p-step completed';
        s4 = 'p-step completed';
        fillWidth = '100%';
    } 
    else {
        s1 = 'p-step active'; 
    }

    return `
        <div class="progress-line-bg">
            <div class="progress-line-fill" style="width: ${fillWidth};"></div>
        </div>
        <div class="progress-steps">
            <div class="${s1}"><div class="p-dot"><i class="fa-solid fa-check"></i></div><div class="p-label">Ordered</div></div>
            <div class="${s2}"><div class="p-dot"><i class="fa-solid fa-check"></i></div><div class="p-label">Shipped</div></div>
            <div class="${s3}"><div class="p-dot"><i class="fa-solid fa-check"></i></div><div class="p-label">Out for delivery</div></div>
            <div class="${s4}"><div class="p-dot"><i class="fa-solid fa-check"></i></div><div class="p-label">Delivered</div></div>
        </div>`;
}

function renderHistory(orders) {
    const container = document.getElementById('history-container');
    const noMsg = document.getElementById('no-history-msg');

    container.innerHTML = '';

    if (orders.length === 0) {
        noMsg.classList.remove('hidden');
        return;
    }

    noMsg.classList.add('hidden');
    
    orders.forEach(order => {
        const stat = order.status ? order.status.toLowerCase() : '';
        const isCancelled = stat === 'cancelled';
        const color = isCancelled ? '#dc2626' : '#059669';
        
        let displayStatus = order.status;
        if (stat === 'new' || stat === 'payment') displayStatus = 'New';
        if (stat === 'confirmed' || stat === 'preparing') displayStatus = 'Preparing';
        if (stat === 'ready') displayStatus = 'Ready';
        if (stat === 'completed' || stat === 'done') displayStatus = 'Completed';
        if (stat === 'delivered') displayStatus = 'Delivered';
        
        const orderId = order.id || order.ORDER_ID;
        const priceDisplay = `$${order.totalPrice || order.total}`;

        const html = `
        <div class="order-card" style="opacity:0.85; border-left: 5px solid ${color}">
            <div class="card-header-bar">
                <div class="order-id">
                    <h3>Order #${orderId}</h3>
                    <span>${new Date(order.ordered_at || order.timestamp).toLocaleDateString()} • ${new Date(order.ordered_at || order.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style="text-align:right">
                    <span style="font-weight:bold; color:#0a192f; display:block">${priceDisplay}</span>
                    <span style="font-size:0.85rem; font-weight:600; color:${color}">${displayStatus}</span>
                </div>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

async function cancelOrder(orderId) {
    const isConfirmed = confirm(`Are you sure you want to cancel Order #${orderId}?`);
    if (!isConfirmed) return; 

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            alert("Your session has expired. Please login again.");
            logoutUser();
            return;
        }

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to cancel the order');
        }

        alert(`Order #${orderId} has been cancelled successfully.`);
        fetchUserOrders();

    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('An error occurred while cancelling the order: ' + error.message);
    }
}