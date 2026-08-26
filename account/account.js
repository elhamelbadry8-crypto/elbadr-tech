let currentAccountData = {}; 
const API_BASE_URL = 'https://elbadr-tecnolog.vercel.app/api'; 

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
        window.location.href = "../login/login.html";
        return;
    }

    fetchAccountData();
});

// ==========================================
// 1. دالة جلب البيانات من السيرفر
// ==========================================
async function fetchAccountData() {
    const token = localStorage.getItem("jwtToken");
    try {
        // تم التعديل هنا إلى /account مطابقة للباك إند
        const response = await fetch(`${API_BASE_URL}/account`, {
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

        const data = await response.json();

        if (response.ok) {
            currentAccountData = data.user; 

            // تحديث بيانات الواجهة (Display Mode)
            document.getElementById("user-name").innerText = data.user.NAME;
            document.getElementById("user-email").innerText = data.user.EMAIL;
            document.getElementById("user-phone").innerText = data.user.PHONE || "No phone added";

            // عرض الصورة لو موجودة
            if (data.user.IMAGE) {
                document.getElementById("default-avatar-icon").style.display = "none";
                const imgDisplay = document.getElementById("account-image-display");
                imgDisplay.src = data.user.IMAGE;
                imgDisplay.style.display = "block";
            }
        }
    } catch (error) {
        console.error("Error fetching account data:", error);
    }
}

// ==========================================
// 2. دوال التحكم في الواجهة (Edit Mode)
// ==========================================
function enableEdit() {
    document.getElementById("display-mode").style.display = "none";
    document.getElementById("edit-mode").style.display = "block";
    
    document.getElementById("edit-name").value = currentAccountData.NAME || "";
    document.getElementById("edit-phone").value = currentAccountData.PHONE || "";
    document.getElementById("edit-email-display").innerText = currentAccountData.EMAIL || "";
}

function cancelEdit() {
    document.getElementById("edit-mode").style.display = "none";
    document.getElementById("display-mode").style.display = "block";
}

// ==========================================
// 3. دالة الحفظ (Save Account)
// ==========================================
async function saveAccount(event) {
    if (event) event.preventDefault(); 
    
    const token = localStorage.getItem("jwtToken");
    const newName = document.getElementById("edit-name").value.trim();
    const newPhone = document.getElementById("edit-phone").value.trim();
    const imageInput = document.getElementById("edit-image");

    if (!newPhone) {
        alert("Phone number is required.");
        return;
    }

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(newPhone)) {
        alert("Please enter a valid Egyptian phone number (e.g., 01012345678).");
        return;
    }

    const saveBtn = document.getElementById("save-account-btn") || (event ? event.target : null);
    let originalBtnText = "Save Changes";
    if (saveBtn) {
        originalBtnText = saveBtn.innerText;
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;
    }

    let accountImageBase64 = currentAccountData.IMAGE || null;

    if (imageInput && imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];
        try {
            accountImageBase64 = await toBase64(file);
        } catch (error) {
            alert("Error reading image file.");
            if (saveBtn) {
                saveBtn.innerText = originalBtnText;
                saveBtn.disabled = false;
            }
            return;
        }
    }

    try {
        // تم التعديل هنا إلى /account وتغيير profile_image إلى account_image لتتطابق مع الباك إند
        const response = await fetch(`${API_BASE_URL}/account`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                name: newName,
                phone: newPhone,
                account_image: accountImageBase64
            })
        });

        if (response.status === 401) {
            alert("Your session has expired. Please login again.");
            logoutUser();
            return;
        }

        if (response.ok) {
            cancelEdit();
            fetchAccountData(); 
            if (imageInput) imageInput.value = "";
            alert("Account updated successfully!");
        } else {
            const errorData = await response.json();
            alert("Error: " + (errorData.error || "Failed to update account"));
        }
    } catch (error) {
        console.error("Error updating account:", error);
        alert("Network error occurred.");
    } finally {
        if (saveBtn) {
            saveBtn.innerText = originalBtnText;
            saveBtn.disabled = false;
        }
    }
}

// ==========================================
// 4. دالة مساعدة لتحويل الصورة لـ Base64 
// ==========================================
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// ==========================================
// 5. دالة تسجيل الخروج
// ==========================================
function logoutUser(event) {
    if (event) event.preventDefault();
    localStorage.removeItem("jwtToken"); 
    localStorage.removeItem("customerId");
    localStorage.removeItem("customer_id");
    localStorage.removeItem("diningMode");
    window.location.href = "../home/home.html";
}

// ==========================================
// 6. دوال مسح الحساب (Delete Account)
// ==========================================
function showDeleteModal() {
    document.getElementById("delete-password").value = ""; 
    document.getElementById("delete-modal").style.display = "flex";
}

function hideDeleteModal() {
    document.getElementById("delete-modal").style.display = "none";
}

async function confirmDeleteAccount() {
    const password = document.getElementById("delete-password").value;
    const token = localStorage.getItem("jwtToken"); 
    
    if (!password) {
        alert("Please enter your password to confirm.");
        return;
    }

    const btn = document.getElementById("confirm-delete-btn");
    const originalText = btn.innerText;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    btn.disabled = true;

    try {
        // تم التعديل هنا إلى /account
        const response = await fetch(`${API_BASE_URL}/account`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password: password })
        });

        if (response.status === 401) {
            const result = await response.json();
            alert(result.error || "Session expired or invalid password.");
            if(result.error && result.error.includes("expired")) {
                 logoutUser();
            } else {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
            }
            return;
        }

        const result = await response.json();

        if (response.ok) {
            alert("Your account has been successfully deleted.");
            logoutUser(); 
        } else {
            alert(result.error || "Failed to delete account.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Error deleting account:", error);
        alert("A network error occurred. Please try again.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
