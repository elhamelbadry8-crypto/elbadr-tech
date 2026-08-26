// ==========================================
// 1. إعدادات الصفحة عند التحميل (Navbar & Links)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const userNavLinks = document.getElementById("user-nav-links");
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("customer_id");

    if (userNavLinks) {
        if (customerId) {
            userNavLinks.innerHTML = `
                <li style="list-style: none;"><a href="../account/account.html"><i class="fa-solid fa-user"></i> My Account</a></li>
                <li style="list-style: none;"><a href="../tracking/tracking.html"><i class="fa-solid fa-truck"></i> My Shipping</a></li>
                <li style="list-style: none;"><a href="../review/review.html"><i class="fa-solid fa-star"></i> Reviews</a></li>
                <li style="list-style: none;"><a href="#" onclick="logoutUser(event)" style="color: #ef4444; font-weight: 600;"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
            `;
        } else {
            userNavLinks.innerHTML = `
                <li style="list-style: none;"><a href="../login/login.html"><i class="fa-solid fa-right-to-bracket"></i> Sign In</a></li>
                <li style="list-style: none;"><a href="../tracking/tracking.html"><i class="fa-solid fa-truck"></i> My Shipping</a></li>
                <li style="list-style: none;"><a href="../review/review.html"><i class="fa-solid fa-star"></i> Reviews</a></li>
            `;
        }
    }

    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.innerText = "Proceed to Checkout";
    }
});

window.logoutUser = function(event) {
    if (event) event.preventDefault(); 
    localStorage.removeItem("customerId");
    localStorage.removeItem("customer_id");
    localStorage.removeItem("diningMode");
    window.location.href = "../home/home.html";
};

// ==========================================
// ===== DYNAMIC DATA (Products Items) =====
// ==========================================
let menuItems = []; 

async function fetchMenuItems() {
    try {
        const response = await fetch('https://elbadr-tecnolog.vercel.app/api/product');
        if (!response.ok) throw new Error('Network response was not ok');
        
        menuItems = await response.json();
        renderMenu(); 
    } catch (error) {
        console.error("Error fetching appliances:", error);
        document.getElementById('menu-grid').innerHTML = '<p style="text-align:center; width:100%; grid-column: 1 / -1; padding: 20px;">عذراً، لم نتمكن من تحميل قائمة المنتجات. تأكد من تشغيل السيرفر.</p>';
    }
}

const menuGrid = document.getElementById('menu-grid');

function renderMenu(filter = 'all') {
    if (!menuGrid) return;
    menuGrid.innerHTML = ''; 
    
    const filteredItems = filter === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.maincategory === filter);

    if (filteredItems.length === 0) {
        menuGrid.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1 / -1; color: #64748b; padding: 20px;">No products found in this category.</p>';
        return;
    }

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('menu-card');
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <div class="card-info">
                <h3>${item.name}</h3>
                <p>${item.description || 'No description available.'}</p>
                <div class="price-row">
                    <span class="price">E£${Number(item.price).toFixed(2)}</span>
                    <button class="add-btn" onclick="addToCart(${item.id})">
                        + Add
                    </button>
                </div>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

fetchMenuItems();

function filterMenu(category) {
    renderMenu(category);
}

// ===== CART LOGIC =====
// ===== CART LOGIC =====
let cart = JSON.parse(localStorage.getItem('cartItems')) || [];

// قم بتحديث واجهة السلة مباشرة فور تحميل الصفحة لتعرض المنتجات المحفوظة
document.addEventListener("DOMContentLoaded", () => {
    // ... الكود القديم الخاص بالـ Navbar ...
    updateCartUI(); // أضف هذا السطر لتحديث العرض فور فتح الصفحة
});

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const countEl = document.getElementById('cart-count');
    const mobileCountEl = document.getElementById('mobile-cart-count');
    
    // احفظ السلة في الـ localStorage مع كل تحديث[cite: 10]
    localStorage.setItem('cartItems', JSON.stringify(cart));
    
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            count += item.quantity;
            
            const itemEl = document.createElement('div');
            itemEl.classList.add('cart-item');
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/60'">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>E£${Number(item.price).toFixed(2)}</p>
                    <div class="cart-controls">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                        <i class="fa-solid fa-trash remove-btn" onclick="removeItem(${item.id})"></i>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemEl);
        });
    }

    if (totalEl) totalEl.innerText = `E£${total.toFixed(2)}`;
    if (countEl) countEl.innerText = count;
    if (mobileCountEl) mobileCountEl.innerText = count;
}

function changeQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeItem(id);
        } else {
            updateCartUI();
        }
    }
}

function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

function toggleCart(forceOpen = false) {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar) return;
    if (forceOpen) {
        sidebar.classList.add('open');
    } else {
        sidebar.classList.toggle('open');
    }
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty! Add some appliances first.");
        return;
    }

    localStorage.setItem('cartItems', JSON.stringify(cart));
    
    const isLoggedIn = localStorage.getItem("customerId") || localStorage.getItem("customer_id"); 

    if (!isLoggedIn) {
        alert("Please login first to proceed with checkout.");
        window.location.href = "../login/login.html";
        return; 
    }

    window.location.href = "../checkout/checkout.html";
}

// ==========================================
// ===== AI APPLIANCE ADVISOR LOGIC =====
// ==========================================
const modal = document.getElementById('ai-modal');
const questionText = document.getElementById('ai-question-text');
const optionsContainer = document.getElementById('ai-options');

let aiStep = 0;
let userPreferences = {
    category: 'all',   
    usage: 'any',     
    budget: 'any'      
};

function startAIFlow() {
    if (!modal) return;
    modal.style.display = "block";
    aiStep = 1;
    userPreferences = { category: 'all', usage: 'any', budget: 'any' };
    askQuestion();
}

function closeAIModal() {
    if (modal) modal.style.display = "none";
}

function askQuestion() {
    if (!questionText || !optionsContainer) return;
    optionsContainer.innerHTML = ''; 

    if (aiStep === 1) {
        questionText.innerHTML = "Advisor: <em>\"Welcome! What category of appliances are you looking for?\"</em>";
        createOptionBtn('<i class="fa-solid fa-snowflake"></i> Refrigerators', 'refrigerators', 1);
        createOptionBtn('<i class="fa-solid fa-utensils"></i> Cookers & Built-in', 'cookers', 1);
        createOptionBtn('<i class="fa-solid fa-tv"></i> Screens & TV', 'screens', 1);
        createOptionBtn('<i class="fa-solid fa-wind"></i> Air Conditioners', 'air_conditioners', 1);
        createOptionBtn('<i class="fa-solid fa-wand-magic-sparkles"></i> Surprise Me!', 'all', 1);
    } 
    else if (aiStep === 2) {
        questionText.innerHTML = "Advisor: <em>\"What is your primary focus for this appliance?\"</em>";
        createOptionBtn('<i class="fa-solid fa-bolt"></i> Energy Saving / Eco-Friendly', 'eco', 2);
        createOptionBtn('<i class="fa-solid fa-gauge-high"></i> High Performance & Power', 'performance', 2);
        createOptionBtn('<i class="fa-solid fa-face-smile"></i> Standard & Reliable', 'any', 2);
    } 
    else if (aiStep === 3) {
        questionText.innerHTML = "Advisor: <em>\"What is your budget range for this item?\"</em>";
        createOptionBtn('<i class="fa-solid fa-coins"></i> Budget-Friendly (Under E£5,000)', 'low', 3);
        createOptionBtn('<i class="fa-solid fa-gem"></i> Premium Experience (Over E£5,000)', 'high', 3);
        createOptionBtn('<i class="fa-solid fa-wallet"></i> Price doesn\'t matter', 'any', 3);
    }
    else {
        showThinkingAnimation();
    }
}

function createOptionBtn(text, value, step) {
    const btn = document.createElement('button');
    btn.classList.add('ai-option-btn');
    btn.innerHTML = text; 
    btn.onclick = () => {
        if (step === 1) userPreferences.category = value;
        if (step === 2) userPreferences.usage = value;
        if (step === 3) userPreferences.budget = value;
        aiStep++;
        askQuestion();
    };
    optionsContainer.appendChild(btn);
}

function showThinkingAnimation() {
    if (!questionText || !optionsContainer) return;
    questionText.innerHTML = "Advisor is analyzing the best appliances for your needs...";
    optionsContainer.innerHTML = '<div class="chef-loading"><i class="fa-solid fa-gear fa-spin"></i></div>';
    setTimeout(showRecommendation, 1500); 
}

function showRecommendation() {
    if (!questionText || !optionsContainer) return;
    if (menuItems.length === 0) {
        questionText.innerText = "No appliances available at the moment.";
        optionsContainer.innerHTML = '';
        return;
    }

    let validItems = menuItems;
    if (userPreferences.category !== 'all') {
        validItems = menuItems.filter(item => item.maincategory === userPreferences.category);
    }
    if (validItems.length === 0) validItems = menuItems; 

    let scoredItems = validItems.map(item => {
        let score = 0;
        if (userPreferences.budget === 'low' && item.price <= 5000) score += 15;
        if (userPreferences.budget === 'high' && item.price > 5000) score += 15;
        return { ...item, matchScore: score };
    });

    scoredItems.sort((a, b) => b.matchScore - a.matchScore);
    let recommendation = scoredItems[0];

    questionText.innerHTML = "Advisor: <em>\"Here is the best appliance match for your specifications!\"</em>";

    optionsContainer.innerHTML = `
        <div class="recommendation-card">
            <img src="${recommendation.image}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" class="rec-img">
            <h4 class="rec-title">${recommendation.name}</h4>
            <p class="rec-desc">${recommendation.description || 'A top-tier electrical appliance selected for you.'}</p>
            <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 15px; font-size: 0.9rem; color: #666; flex-wrap: wrap;">
                <span title="Category"><i class="fa-solid fa-tag" style="color: #3b82f6;"></i> ${recommendation.maincategory || 'General'}</span>
            </div>
            <p class="rec-price">E£${Number(recommendation.price).toFixed(2)}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="ai-btn" style="flex: 1;" onclick="addRecToCart(${recommendation.id})">
                    <i class="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
                <button class="ai-btn" style="flex: 1; background: transparent; border: 2px solid var(--primary); color: var(--primary);" onclick="startAIFlow()">
                    <i class="fa-solid fa-rotate-right"></i> Start Over
                </button>
            </div>
        </div>
    `;
}

function addRecToCart(id) {
    addToCart(id);
    closeAIModal();
    toggleCart(true); 
}

window.onclick = function(event) {
    if (event.target == modal) {
        closeAIModal();
    }
}
