/* =================================================================
   FILE: js/controllers/tin-tuc.js
   MÔ TẢ: Controller cho trang tin tức và chi tiết tin tức
   ================================================================= */

// ===== VARIABLES =====
let allNews = [];
let currentSortOrder = 'newest';
const itemsPerPage = 6;
let currentPage = 1;

// ===== NEWS LIST PAGE FUNCTIONS =====

/**
 * Initialize the news listing page
 */
async function initializeNewsPage() {
    try {
        // Show loading state
        const newsContainer = document.getElementById('news-container');
        if (newsContainer) {
            newsContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>`;
        }

        // Fetch news data from API
        const news = await fetchNewsData();
        allNews = news;

        if (!allNews || allNews.length === 0) {
            if (newsContainer) {
                newsContainer.innerHTML = `
                    <div class="no-data" style="text-align: center; padding: 40px 20px; color: #666;">
                        <i class="fas fa-newspaper" style="font-size: 48px; color: #ccc; margin-bottom: 20px; display: block;"></i>
                        <p>Hiện chưa có tin tức nào. Vui lòng quay lại sau.</p>
                    </div>
                `;
            }
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Display news
        displayNewsPage();

    } catch (error) {
        console.error('Lỗi khi khởi tạo trang tin tức:', error);
        const newsContainer = document.getElementById('news-container');
        if (newsContainer) {
            newsContainer.innerHTML = `
                <div class="error" style="text-align: center; padding: 40px 20px; color: #d32f2f;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                    <p>Không thể tải dữ liệu tin tức. Vui lòng thử lại sau.</p>
                </div>
            `;
        }
    }
}

/**
 * Fetch news data from the API
 */
async function fetchNewsData() {
    try {
        const response = await fetch('http://localhost:3000/api/news');
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            console.error('Backend báo lỗi:', data.error);
            return [];
        }
        return Array.isArray(data.news) ? data.news : [];
    } catch (error) {
        console.error('❌ Lỗi kết nối đến API tin tức:', error);
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
            displayNewsPage();
        });
    }
}

/**
 * Display news list with pagination
 */
function displayNewsPage() {
    // Sort news
    const sortedNews = sortNews([...allNews], currentSortOrder);

    // Calculate pagination
    const totalPages = Math.ceil(sortedNews.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedNews = sortedNews.slice(startIndex, startIndex + itemsPerPage);

    // Display news items
    displayNewsItems(paginatedNews);

    // Display pagination
    displayPagination(totalPages, sortedNews.length);
}

/**
 * Sort news based on order
 */
function sortNews(news, order) {
    if (order === 'newest') {
        return news.sort((a, b) => {
            const dateA = new Date(a.ngay || a.createdAt || 0);
            const dateB = new Date(b.ngay || b.createdAt || 0);
            return dateB - dateA;
        });
    } else {
        return news.sort((a, b) => {
            const dateA = new Date(a.ngay || a.createdAt || 0);
            const dateB = new Date(b.ngay || b.createdAt || 0);
            return dateA - dateB;
        });
    }
}

/**
 * Display news items in the container
 */
function displayNewsItems(news) {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;

    newsContainer.innerHTML = news.map(item => createNewsCardHTML(item)).join('');
    
    // Add click handlers to load detail page
    document.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('click', function(e) {
            const id = this.getAttribute('data-id');
            if (id) {
                window.location.href = `chi-tiet-tin.html?id=${id}`;
            }
        });
    });
}

/**
 * Create HTML for a news card
 */
function createNewsCardHTML(news) {
    const id = news.id;
    const title = news.tieuDe || 'Tin tức';
    // Lấy mô tả ngắn từ ct1 (content 1)
    const description = news.ct1 || news.moTaNgan || '';
    const contentPreview = description.substring(0, 150) + (description.length > 150 ? '...' : '');
    // Ưu tiên lấy ảnh từ anhDaiDien, nếu không thì lấy từ img1
    let imageUrl = news.anhDaiDien || news.img1 || 'https://via.placeholder.com/400x250/003478/fff';
    
    // Xây dựng đúng path cho ảnh nếu là tên file
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = `../assets/images/pages/tin-tuc/${imageUrl}`;
    }
    
    const dateString = news.ngay || new Date().toLocaleDateString('vi-VN');
    const formattedDate = formatDate(dateString);

    return `
        <div class="news-card" data-id="${id}">
            <div class="news-img">
                <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/400x250/003478/fff'">
            </div>
            <div class="news-content">
                <span class="news-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                <h3><a href="chi-tiet-tin.html?id=${id}">${title}</a></h3>
                <p>${contentPreview}</p>
                <a href="chi-tiet-tin.html?id=${id}" class="read-more">Đọc tiếp <i class="fas fa-arrow-right"></i></a>
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
    paginationContainer.innerHTML = '';

    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Trước';
        prevBtn.addEventListener('click', () => {
            currentPage--;
            displayNewsPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationContainer.appendChild(prevBtn);
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            if (i === currentPage - 2 || i === currentPage + 2) {
                paginationContainer.innerHTML += '<span class="page-ellipsis">...</span>';
            }
            
            if (i < currentPage - 1 || i > currentPage + 1) continue;

            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                displayNewsPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            paginationContainer.appendChild(pageBtn);
        }
    }

    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = 'Tiếp <i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => {
            currentPage++;
            displayNewsPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationContainer.appendChild(nextBtn);
    }
}

// ===== NEWS DETAIL PAGE FUNCTIONS =====

/**
 * Load and display news detail
 */
async function loadNewsDetail() {
    try {
        // Get news ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const newsId = urlParams.get('id');

        if (!newsId) {
            showErrorState('ID tin tức không hợp lệ');
            return;
        }

        // Show loading state
        showLoadingState();

        // Fetch news detail from API
        const newsItem = await fetchNewsById(newsId);
        
        if (!newsItem) {
            showErrorState('Không tìm thấy tin tức này');
            return;
        }

        // Display the news detail
        displayNewsArticle(newsItem);

        // Log data for debugging
        console.log('📰 Tin tức đã tải:', newsItem);
        console.log('🔍 Các cột có trong tin tức:', Object.keys(newsItem));

        // Load related news
        loadRelatedNews(newsItem);

    } catch (error) {
        console.error('Lỗi khi tải chi tiết tin tức:', error);
        showErrorState('Có lỗi khi tải tin tức. Vui lòng thử lại.');
    }
}

/**
 * Fetch news detail by ID from the API
 */
async function fetchNewsById(newsId) {
    try {
        const response = await fetch(`http://localhost:3000/api/news/${encodeURIComponent(newsId)}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            console.error('Backend báo lỗi:', data.error);
            return null;
        }
        return data.news || null;
    } catch (error) {
        console.error('❌ Lỗi kết nối đến API tin tức:', error);
        return null;
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const loadingContainer = document.getElementById('loading-container');
    const newsDetail = document.getElementById('news-detail');
    const errorContainer = document.getElementById('error-container');

    if (loadingContainer) loadingContainer.style.display = 'block';
    if (newsDetail) newsDetail.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
}

/**
 * Show error state
 */
function showErrorState(message = 'Có lỗi xảy ra') {
    const loadingContainer = document.getElementById('loading-container');
    const newsDetail = document.getElementById('news-detail');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    if (loadingContainer) loadingContainer.style.display = 'none';
    if (newsDetail) newsDetail.style.display = 'none';
    if (errorContainer) {
        errorContainer.style.display = 'block';
        if (errorMessage) errorMessage.textContent = message;
    }
}

/**
 * Display news article in detail view
 */
function displayNewsArticle(newsItem) {
    const loadingContainer = document.getElementById('loading-container');
    const newsDetail = document.getElementById('news-detail');
    const errorContainer = document.getElementById('error-container');

    if (loadingContainer) loadingContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (newsDetail) newsDetail.style.display = 'block';

    // Update page title
    const title = newsItem.tieuDe || 'Chi tiết tin tức';
    document.title = title + ' - Học viện Ngân hàng';

    // Update article elements
    setElementText('article-title', title);
    setElementText('breadcrumb-title', title);
    setElementText('article-date', formatDate(newsItem.ngay));

    // Set featured image
    const featuredImage = document.getElementById('article-featured-image');
    if (featuredImage) {
        let mainImage = newsItem.anhDaiDien || newsItem.img1 || 'https://via.placeholder.com/1200x400/003478/fff';
        
        // Xây dựng đúng path cho ảnh nếu là tên file
        if (!mainImage.startsWith('http') && !mainImage.startsWith('/')) {
            mainImage = `../assets/images/pages/tin-tuc/${mainImage}`;
        }
        
        featuredImage.src = mainImage;
        featuredImage.alt = title;
        featuredImage.onerror = function() {
            this.src = 'https://via.placeholder.com/1200x400/003478/fff';
        };
    }

    // Display article body
    displayArticleBody(newsItem);
}

/**
 * Display article body content - duyệt qua img1, ct1, img2, ct2, ...
 * Cấu trúc: (ảnh) - (content ngay dưới ảnh)
 */
function displayArticleBody(newsItem) {
    const articleBody = document.getElementById('article-body');
    if (!articleBody) return;

    let contentHTML = '';
    let contentIndex = 1;
    const maxIndex = 20; // Giả sử tối đa có 20 cặp img/ct
    let contentCount = 0;

    // Lặp qua các cột img1, ct1, img2, ct2, ...
    while (contentIndex <= maxIndex) {
        const imgColumn = `img${contentIndex}`;
        const ctColumn = `ct${contentIndex}`;

        let imgValue = newsItem[imgColumn];
        const ctValue = newsItem[ctColumn];

        // Nếu cả ảnh lẫn content đều trống thì dừng
        if (!imgValue && !ctValue) {
            contentIndex++;
            continue;
        }

        // Hiển thị image trước (nếu có)
        if (imgValue && imgValue.trim() !== '') {
            // Parse format: (filename)-(caption)
            // Ví dụ: (0_1.jpg)-(Toàn cảnh buổi gặp mặt)
            let imageSrc = '';
            let imageCaption = '';
            
            const imgMatch = imgValue.match(/^\((.*?)\)-(.*)$/);
            if (imgMatch) {
                imageSrc = imgMatch[1].trim();
                imageCaption = imgMatch[2].trim();
            } else {
                // Nếu không match format, giả sử toàn bộ là tên file
                imageSrc = imgValue.trim();
            }
            
            // Xây dựng đúng path cho ảnh
            if (!imageSrc.startsWith('http') && !imageSrc.startsWith('/')) {
                imageSrc = `../assets/images/pages/tin-tuc/${imageSrc}`;
            }
            
            contentHTML += `<img src="${imageSrc}" alt="${imageCaption || `Hình ảnh ${contentIndex}`}" class="article-inline-image" onerror="this.src='https://via.placeholder.com/800x400/ddd/999'; this.style.opacity='0.7'">`;
            
            // Hiển thị chú thích ảnh nếu có
            if (imageCaption) {
                contentHTML += `<p class="image-caption"><em>${imageCaption}</em></p>`;
                console.log(`✅ Thêm chú thích ảnh từ ${imgColumn}:`, imageCaption);
            }
            
            contentCount++;
            console.log(`✅ Thêm hình từ ${imgColumn}:`, imageSrc);
        }

        // Hiển thị content ngay dưới ảnh (nếu có)
        // Với ct1 thì thêm <strong>
        if (ctValue && ctValue.trim() !== '') {
            if (contentIndex === 1) {
                // ct1 với <strong>
                contentHTML += `<p><strong>${ctValue}</strong></p>`;
            } else {
                // ct2, ct3, ... bình thường
                contentHTML += `<p>${ctValue}</p>`;
            }
            contentCount++;
            console.log(`✅ Thêm content từ ${ctColumn}:`, ctValue.substring(0, 50) + '...');
        }

        contentIndex++;
    }

    // Nếu không có nội dung chi tiết, hiển thị mô tả
    if (!contentHTML) {
        contentHTML = `<p>${newsItem.ct1 || newsItem.moTaNgan || 'Nội dung tin tức sẽ được cập nhật.'}</p>`;
        console.log('ℹ️ Sử dụng mô tả thay vì content chi tiết');
    } else {
        console.log(`📝 Đã hiển thị ${contentCount} phần tử (hình/content)`);
    }

    articleBody.innerHTML = contentHTML;
}

/**
 * Load related news
 */
async function loadRelatedNews(currentNews) {
    try {
        const allNews = await fetchNewsData();
        
        // Filter out current news and get 3 most recent
        const relatedNews = allNews
            .filter(news => news.id !== currentNews.id)
            .sort((a, b) => new Date(b.ngay || 0) - new Date(a.ngay || 0))
            .slice(0, 3);

        if (relatedNews.length === 0) {
            const relatedSection = document.getElementById('related-news-section');
            if (relatedSection) relatedSection.style.display = 'none';
            return;
        }

        // Display related news
        const relatedContainer = document.getElementById('related-news-container');
        if (relatedContainer) {
            relatedContainer.innerHTML = relatedNews.map(news => {
                const id = news.id;
                const newsTitle = news.tieuDe || 'Tin tức';
                let imageUrl = news.anhDaiDien || news.img1 || 'https://via.placeholder.com/300x200/003478/fff';
                
                // Xây dựng đúng path cho ảnh nếu là tên file (Đã sửa lỗi cú pháp tại đây)
                if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
                    imageUrl = `../assets/images/pages/tin-tuc/${imageUrl}`;
                }
                
                const dateString = news.ngay;
                const formattedDate = formatDate(dateString);

                return `
                    <div class="news-card">
                        <div class="news-img">
                            <img src="${imageUrl}" alt="${newsTitle}" onerror="this.src='https://via.placeholder.com/300x200/003478/fff'">
                        </div>
                        <div class="news-content">
                            <span class="news-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                            <h3><a href="chi-tiet-tin.html?id=${id}">${newsTitle}</a></h3>
                        </div>
                    </div>
                `;
            }).join('');
        }

        const relatedSection = document.getElementById('related-news-section');
        if (relatedSection) relatedSection.style.display = 'block';

    } catch (error) {
        console.error('Lỗi khi tải tin tức liên quan:', error);
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format date to Vietnamese format
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString || 'N/A';
        }
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        return dateString || 'N/A';
    }
}

/**
 * Set text content of an element safely
 */
function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

/**
 * Set HTML content of an element safely
 */
function setElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = html;
    }
}