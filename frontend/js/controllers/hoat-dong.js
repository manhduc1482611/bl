/* =================================================================
   FILE: js/controllers/hoat-dong.js
   MÔ TẢ: Controller cho trang hoạt động
   ================================================================= */

// ===== VARIABLES =====
let allActivities = [];
let currentSortOrder = 'newest';
const itemsPerPage = 6;
let currentPage = 1;

// ===== ACTIVITY LIST PAGE FUNCTIONS =====

/**
 * Initialize the activity listing page
 */
async function initializeActivityPage() {
    try {
        // Show loading state
        const activityContainer = document.getElementById('activity-container');
        if (activityContainer) {
            activityContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>`;
        }

        // Fetch activity data from API
        const activities = await fetchActivityData();
        allActivities = activities;

        if (!allActivities || allActivities.length === 0) {
            if (activityContainer) {
                activityContainer.innerHTML = `
                    <div class="no-data" style="text-align: center; padding: 40px 20px; color: #666;">
                        <i class="fas fa-calendar" style="font-size: 48px; color: #ccc; margin-bottom: 20px; display: block;"></i>
                        <p>Hiện chưa có hoạt động nào. Vui lòng quay lại sau.</p>
                    </div>
                `;
            }
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Display activities
        displayActivityPage();

    } catch (error) {
        console.error('Lỗi khi khởi tạo trang hoạt động:', error);
        const activityContainer = document.getElementById('activity-container');
        if (activityContainer) {
            activityContainer.innerHTML = `
                <div class="error" style="text-align: center; padding: 40px 20px; color: #d32f2f;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                    <p>Không thể tải dữ liệu hoạt động. Vui lòng thử lại sau.</p>
                </div>
            `;
        }
    }
}

/**
 * Fetch activity data from the API
 */
async function fetchActivityData() {
    try {
        const response = await fetch('http://localhost:3000/api/activities');
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            console.error('Backend báo lỗi:', data.error);
            return [];
        }
        return Array.isArray(data.activities) ? data.activities : [];
    } catch (error) {
        console.error('❌ Lỗi kết nối đến API hoạt động:', error);
        return [];
    }
}

/**
 * Set up event listeners for filters and pagination
 */
function setupEventListeners() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            currentPage = 1;
            displayActivityPage();
        });
    }
}

/**
 * Display activity list with pagination
 */
function displayActivityPage() {
    // Sort activities
    let sortedActivities = [...allActivities];
    
    if (currentSortOrder === 'newest') {
        sortedActivities.sort((a, b) => new Date(b.ngay || 0) - new Date(a.ngay || 0));
    } else if (currentSortOrder === 'oldest') {
        sortedActivities.sort((a, b) => new Date(a.ngay || 0) - new Date(b.ngay || 0));
    }

    // Calculate pagination
    const totalPages = Math.ceil(sortedActivities.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedActivities = sortedActivities.slice(startIndex, startIndex + itemsPerPage);

    // Display activities and pagination
    displayActivityItems(paginatedActivities);
    displayPagination(totalPages, sortedActivities.length);
}

/**
 * Display activity items in the container
 */
function displayActivityItems(activities) {
    const activityContainer = document.getElementById('activity-container');
    if (!activityContainer) return;

    activityContainer.innerHTML = activities.map(item => createActivityCardHTML(item)).join('');
    
    // Add click handlers to load detail page
    document.querySelectorAll('.activity-card').forEach(card => {
        card.addEventListener('click', function(e) {
            const id = this.getAttribute('data-id');
            if (id) {
                window.location.href = `chi-tiet-hoat-dong.html?id=${id}`;
            }
        });
    });
}

/**
 * Create HTML for an activity card
 */
function createActivityCardHTML(activity) {
    const id = activity.MHD;
    const title = activity.THD || 'Hoạt động';
    // Lấy mô tả từ MoTa
    const description = activity.MoTa || '';
    const contentPreview = description.substring(0, 150) + (description.length > 150 ? '...' : '');
    // Lấy ảnh từ cột Anh
    let imageUrl = activity.Anh || 'https://via.placeholder.com/400x250/003478/fff';
    
    // Xây dựng đúng path cho ảnh nếu là tên file
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = `../assets/images/pages/hoat-dong/${imageUrl}`;
    }
    
    // Lấy thông tin từ các cột
    const timeString = activity.Time || new Date().toLocaleDateString('vi-VN');
    const formattedDate = formatDate(timeString);
    const phong = activity.Phong || '';
    const toa = activity.tenToa || '';

    return `
        <div class="activity-card" data-id="${id}">
            <div class="activity-img">
                <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/400x250/003478/fff'">
            </div>
            <div class="activity-content">
                <span class="activity-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                <h3><a href="chi-tiet-hoat-dong.html?id=${id}">${title}</a></h3>
                <div class="activity-info">
                    ${phong ? `<span class="info-item"><i class="fas fa-door-open"></i> Phòng: ${phong}</span>` : ''}
                    ${toa ? `<span class="info-item"><i class="fas fa-building"></i> Tòa: ${toa}</span>` : ''}
                </div>
                <p>${contentPreview}</p>
                <a href="chi-tiet-hoat-dong.html?id=${id}" class="read-more">Xem chi tiết <i class="fas fa-arrow-right"></i></a>
            </div>
        </div>
    `;
}

/**
 * Display pagination controls
 */
function displayPagination(totalPages, totalItems) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    let paginationHTML = '';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <a href="#" class="pagination-btn" data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i> Trước
            </a>
        `;
    }

    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        paginationHTML += `<a href="#" class="pagination-btn" data-page="1">1</a>`;
        if (startPage > 2) paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <a href="#" class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </a>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        paginationHTML += `<a href="#" class="pagination-btn" data-page="${totalPages}">${totalPages}</a>`;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <a href="#" class="pagination-btn" data-page="${currentPage + 1}">
                Tiếp <i class="fas fa-chevron-right"></i>
            </a>
        `;
    }

    paginationContainer.innerHTML = paginationHTML;

    // Add click handlers
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(btn.getAttribute('data-page'));
            if (page && page !== currentPage) {
                currentPage = page;
                displayActivityPage();
                window.scrollTo(0, 0);
            }
        });
    });
}

/**
 * Format date to Vietnamese format
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('vi-VN', options);
    } catch (error) {
        return dateString;
    }
}
