document.addEventListener("DOMContentLoaded", () => {
    
    // --- تحديث الـ Navbar وتغيير المسميات بناءً على حالة تسجيل الدخول ---
    const navLinks = document.getElementById("nav-links");
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("customer_id");

    if (navLinks) {
        if (customerId) {
            navLinks.innerHTML = `
                <li><a href="../account/account.html">account</a></li>
                <li><a href="../tracking/tracking.html">my shipping</a></li>
                <li><a href="../review/review.html">review</a></li>
                <li><a href="#about-us">about us</a></li>
                <li><a href="#footerr">contact us</a></li>
            `;
        } else {
            navLinks.innerHTML = `
                <li><a href="../login/login.html">sign in</a></li>
                <li><a href="../tracking/tracking.html">my shipping</a></li>
                <li><a href="../review/review.html">review</a></li>
                <li><a href="#about-us">about us</a></li>
                <li><a href="#footerr">contact us</a></li>
            `;
        }
    }

    // --- تأثير الكتابة (Typewriter) ---
    const textElement = document.querySelector('.typewriter-text');
    const originalText = "WELCOME TO ELBADR TECHNOLOGY"; 
    let charIndex = 0;

    function typeWriter() {
        if (charIndex < originalText.length) {
            textElement.textContent = originalText.slice(0, charIndex + 1);
            charIndex++;
            setTimeout(typeWriter, 50);
        }
    }

    if (textElement) {
        textElement.textContent = "";
        typeWriter();
    }

    setTimeout(() => {
        const button = document.querySelector('.animated-button');
        if (button) {
            button.classList.add('visible');
        }
    }, 2240);
});

window.logoutUser = function(event) {
    if (event) event.preventDefault(); 
    
    localStorage.removeItem("customerId");
    localStorage.removeItem("customer_id");
    localStorage.removeItem("diningMode");
    
    window.location.href = "../home/home.html";
};

window.selectDiningMode = function(mode) {
    localStorage.setItem('diningMode', mode);
    const isLoggedIn = localStorage.getItem("customerId");

    if (!isLoggedIn && (mode === "reservation" || mode === "delivery")) {
        window.location.href = "../login/login.html";
    } else {
        window.location.href = "../product/product.html";
    }
};

window.toggleMenu = function() {
    const nav = document.querySelector('.navig');
    if (nav) {
        nav.classList.toggle('active');
    }
};