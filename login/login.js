const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

// للموبايل 
const signUpMobileLink = document.getElementById('signUpMobile');
const signInMobileLink = document.getElementById('signInMobile');

// ==========================================
// 1. حركات الأنيميشن
// ==========================================
if (signUpButton) signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
if (signInButton) signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));
if (signUpMobileLink) signUpMobileLink.addEventListener('click', () => container.classList.add("right-panel-active"));
if (signInMobileLink) signInMobileLink.addEventListener('click', () => container.classList.remove("right-panel-active"));

// ==========================================
// 2. إعدادات السيرفر 
// ==========================================
const API_BASE_URL = 'http://127.0.0.1:5000/api'; 

// ==========================================
// 🔴 إضافة أمنية: تنظيف المدخلات لمنع الـ XSS
// ==========================================
function escapeHTML(str) {
    if (!str) return str;
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

// ==========================================
// 3. دالة التوجيه
// ==========================================
function performLoginRedirect() {
    window.location.href = "../home/home.html";
}

// ==========================================
// 4. معالجة تسجيل حساب جديد
// ==========================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // جلب الزرار وتعطيله لمنع الـ Spam
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing... <i class="fa fa-spinner fa-spin"></i>';

        // تنظيف البيانات
        const name = escapeHTML(document.getElementById('signupName').value.trim());
        const email = escapeHTML(document.getElementById('signupEmail').value.trim());
        const phone = escapeHTML(document.getElementById('signupPhone').value.trim());
        const password = document.getElementById('signupPassword').value;

        if(!name || !email || !phone || !password) {
            alert("Please fill all fields.");
            resetButton(submitBtn, 'Sign up <i class="fa-solid fa-arrow-right"></i>');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.");
            resetButton(submitBtn, 'Sign up <i class="fa-solid fa-arrow-right"></i>');
            return;
        }

        const phoneRegex = /^01[0125][0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            alert("Please enter a valid Egyptian phone number.");
            resetButton(submitBtn, 'Sign up <i class="fa-solid fa-arrow-right"></i>');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            alert("Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character.");
            resetButton(submitBtn, 'Sign up <i class="fa-solid fa-arrow-right"></i>');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Account created successfully!');
                container.classList.remove("right-panel-active");
                signupForm.reset();
            } else {
                alert('Error: ' + (data.error || 'Signup failed')); 
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Server error. Please ensure Flask is running.');
        } finally {
            resetButton(submitBtn, 'Sign up <i class="fa-solid fa-arrow-right"></i>');
        }
    });
}

// ==========================================
// 5. معالجة تسجيل الدخول
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing... <i class="fa fa-spinner fa-spin"></i>';

        const emailInput = document.getElementById('loginUsername') || document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        const email = escapeHTML(emailInput.value.trim());
        const password = passwordInput.value;

        if(!email || !password) {
            alert("Please enter email and password.");
            resetButton(submitBtn, 'Login');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // 🔴 التعديل الجديد لحفظ الـ JWT
                if (data.token) {
                    localStorage.setItem('jwtToken', data.token); // حفظ التوكن الآمنة
                    // لسه بنحفظ الـ ID مؤقتاً عشان لو في ملفات تانية بتعتمد عليه لحد ما نعدلها
                    localStorage.setItem('customerId', data.customer_id); 
                    localStorage.setItem('customer_id', data.customer_id); 
                }

                alert('Login Successful! Welcome Back');
                performLoginRedirect();
            } else {
                alert('Login Failed: ' + (data.error || 'Invalid credentials')); 
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Connection failed. Is the server running?');
        } finally {
            resetButton(submitBtn, 'Login');
        }
    });
}

// دالة مساعدة لترجيع الزرار لحالته الأصلية
function resetButton(btn, originalText) {
    btn.disabled = false;
    btn.innerHTML = originalText;
}