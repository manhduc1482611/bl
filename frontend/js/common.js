/* =================================================================
   FILE: js/common.js
   MÔ TẢ: Header, Footer, Menu dùng chung
   ================================================================= */

function getCurrentUser() {
    const rawUser = localStorage.getItem('hvnh_current_user');
    if (!rawUser) return null;
    try {
        return JSON.parse(rawUser);
    } catch (error) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem('hvnh_current_user', JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem('hvnh_current_user');
}

function loadHeader(rootPath, activePage) {
    const headerHTML = `
    <div class="header-wrapper">
        <header class="top-header">
            <div class="container header-flex">
                <div class="logo-area">
                    <div class="logo-img">
                        <img src="${rootPath}/assets/images/common/icon.jpg" alt="Logo HVNH" class="logo-circle">
                    </div>
                    <div class="school-name">
                        <h1>Banking Academy of Vietnam</h1>
                        <p>Shining mind, open heart</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="hotline-area">
                        <i class="fas fa-phone-alt"></i> (+84) 24 35 726 384
                    </div>
                    <div class="auth-actions" id="header-auth-actions"></div>
                </div>
            </div>
        </header>
    </div>

    <div class="navbar-wrapper">
        <button class="menu-toggle" id="mobile-menu">
            <i class="fas fa-bars"></i>
        </button>
        <nav class="main-navbar">
            <div class="nav-container">
                <a href="${rootPath}/trang-chu.html" class="${activePage === 'trang-chu' ? 'active' : ''}">
                    <i class="fas fa-home"></i>&nbsp; TRANG CHỦ
                </a>
                <a href="${rootPath}/pages/gioi-thieu.html" class="${activePage === 'gioi-thieu' ? 'active' : ''}">GIỚI THIỆU</a>
                <a href="${rootPath}/pages/ban-do/tim-duong.html" class="${activePage === 'ban-do' ? 'active' : ''}">BẢN ĐỒ SỐ</a>
                <a href="${rootPath}/pages/tin-tuc.html" class="${activePage === 'tin-tuc' ? 'active' : ''}">TIN TỨC</a>
                <a href="${rootPath}/pages/hoat-dong.html" class="${activePage === 'hoat-dong' ? 'active' : ''}">HOẠT ĐỘNG</a>
                <a href="${rootPath}/pages/lien-he.html" class="${activePage === 'lien-he' ? 'active' : ''}">LIÊN HỆ</a>
                <a id="admin-nav-link" href="${rootPath}/pages/admin/admin_map.html" class="${activePage === 'admin' ? 'active' : ''}" style="display: none;">ADMIN</a>
            </div>
        </nav>
    </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    const currentUser = getCurrentUser();
    const authActions = document.getElementById('header-auth-actions');
    const adminNavLink = document.getElementById('admin-nav-link');

    if (currentUser) {
        if (adminNavLink) {
            adminNavLink.style.display = currentUser.acc_type === 'admin_web' ? 'flex' : 'none';
        }
        if (authActions) {
            authActions.innerHTML = `
                <span class="header-user">Xin chào, ${currentUser.displayName || currentUser.username}</span>
                <button id="logout-button" class="btn-header" type="button">Đăng xuất</button>
            `;
            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.addEventListener('click', function() {
                    clearCurrentUser();
                    window.location.reload();
                });
            }
        }
    } else if (authActions) {
        authActions.innerHTML = `<a href="${rootPath}/pages/dangnhap.html" class="btn-header">Đăng nhập</a>`;
    }

    // Xử lý menu mobile
    const menuToggle = document.getElementById('mobile-menu');
    const navContainer = document.querySelector('.nav-container');
    if (menuToggle && navContainer) {
        menuToggle.addEventListener('click', function() {
            navContainer.classList.toggle('active-menu');
            const icon = menuToggle.querySelector('i');
            if (navContainer.classList.contains('active-menu')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Đóng menu khi click ra ngoài
        document.addEventListener('click', function(event) {
            if (!navContainer.contains(event.target) && !menuToggle.contains(event.target)) {
                navContainer.classList.remove('active-menu');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
}

function loadFooter(rootPath) {
    const SCHOOL_WEBSITE = "https://www.hvnh.edu.vn/";
    const FACEBOOK_URL = "https://www.facebook.com/hocviennganhang1961";
    const YOUTUBE_URL = "https://www.youtube.com/@bav.1961";

    const footerHTML = `
    <div class="footer-wrapper">
        <footer class="container footer-flex">
            <div class="footer-left">
                <h3>BANKING ACADEMY OF VIETNAM</h3>
                <ul class="footer-info">
                    <li><span>+</span> Address: 12 Chua Boc Street, Kim Lien Ward, Hanoi</li>
                    <li><span>+</span> Tel: (+84) 24 35 726 384</li>
                    <li><span>+</span> Fax: (+84) 24 35 726 634</li>
                    <li><span>+</span> Email: truyenthong@hvnh.edu.vn</li>
                </ul>
            </div>
            <div class="footer-right">
                <h3>Connect With Us</h3>
                <div class="social-icons">
                    <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer" title="Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="${YOUTUBE_URL}" target="_blank" rel="noopener noreferrer" title="Youtube">
                        <i class="fab fa-youtube"></i>
                    </a>
                    <a href="${SCHOOL_WEBSITE}" target="_blank" rel="noopener noreferrer" title="Website">
                        <i class="fas fa-globe"></i>
                    </a>
                </div>
            </div>
        </footer>
        <button class="scroll-top-btn" onclick="window.scrollTo({top: 0, behavior: 'smooth'});" title="Lên đầu trang">
            <i class="fas fa-chevron-up"></i>
        </button>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
}