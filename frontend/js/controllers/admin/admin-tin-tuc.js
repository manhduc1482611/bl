/* =================================================================
   FILE: js/controllers/admin/admin-tin-tuc.js
   MÔ TẢ: Admin controller quản lý tin tức
   ================================================================= */

let allNews = [];
let currentEditId = null;
let selectedImageFile = null;

/**
 * Initialize the news admin page
 */
async function initializeNewsAdmin() {
    try {
        setupImageUpload();
        await loadNewsData();
        setupSearch();
    } catch (error) {
        console.error('Lỗi khởi tạo trang admin tin tức:', error);
    }
}

/**
 * Load all news data from API
 */
async function loadNewsData() {
    try {
        console.log('Đang tải dữ liệu tin tức từ API...');
        const response = await fetch('http://localhost:3000/api/news');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dữ liệu tin tức nhận được:', data);
        
        allNews = Array.isArray(data.news) ? data.news : [];
        console.log('Số tin tức được tải:', allNews.length);
        
        displayNewsTable();
    } catch (error) {
        console.error('Lỗi tải dữ liệu tin tức:', error);
        const tbody = document.getElementById('news-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Lỗi: ${error.message}</td></tr>`;
        }
    }
}

/**
 * Display news in table
 */
function displayNewsTable() {
    const tbody = document.getElementById('news-table-body');
    if (!tbody) return;

    if (allNews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Không có tin tức nào</td></tr>';
        return;
    }

    tbody.innerHTML = allNews.map(news => `
        <tr>
            <td>${news.id}</td>
            <td>${news.tieuDe || ''}</td>
            <td>${formatDate(news.ngay)}</td>
            <td>${(news.moTaNgan || '').substring(0, 50)}...</td>
            <td>
                <button onclick="openEditModal(${news.id})" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Open edit modal for a news item
 */
async function openEditModal(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/news/${id}`);
        const data = await response.json();
        const news = data.news;

        currentEditId = id;
        document.getElementById('edit-tieu-de').value = news.tieuDe || '';
        document.getElementById('edit-ngay').value = news.ngay || '';
        document.getElementById('edit-mo-ta-ngan').value = news.moTaNgan || '';
        
        // Show delete button when editing
        document.getElementById('btn-delete-news').style.display = 'block';

        // Show image preview if exists
        if (news.anhDaiDien) {
            const imagePreviewContainer = document.getElementById('image-preview-container');
            const imagePreview = document.getElementById('image-preview');
            let imageSrc = news.anhDaiDien;
            if (!imageSrc.startsWith('http') && !imageSrc.startsWith('/')) {
                imageSrc = `../../assets/images/pages/tin-tuc/${imageSrc}`;
            }
            imagePreview.src = imageSrc;
            imagePreviewContainer.style.display = 'block';
        }

        document.getElementById('edit-modal').style.display = 'flex';
    } catch (error) {
        console.error('Lỗi mở modal:', error);
    }
}

/**
 * Open add modal for new news
 */
function openAddModal() {
    currentEditId = null;
    document.getElementById('edit-tieu-de').value = '';
    document.getElementById('edit-ngay').value = new Date().toISOString().split('T')[0];
    document.getElementById('edit-mo-ta-ngan').value = '';
    document.getElementById('btn-delete-news').style.display = 'none';
    document.getElementById('image-preview-container').style.display = 'none';
    selectedImageFile = null;
    document.getElementById('edit-modal').style.display = 'flex';
}

/**
 * Close edit modal
 */
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    currentEditId = null;
    selectedImageFile = null;
    document.getElementById('image-preview-container').style.display = 'none';
}

/**
 * Save news (add or update)
 */
async function saveNews(event) {
    event.preventDefault();

    const tieuDe = document.getElementById('edit-tieu-de').value;
    const ngay = document.getElementById('edit-ngay').value;
    const moTaNgan = document.getElementById('edit-mo-ta-ngan').value;

    if (!tieuDe || !ngay) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('tieuDe', tieuDe);
        formData.append('ngay', ngay);
        formData.append('moTaNgan', moTaNgan);
        
        if (selectedImageFile) {
            formData.append('anhDaiDien', selectedImageFile);
        }

        let url = 'http://localhost:3000/api/news';
        let method = 'POST';

        if (currentEditId) {
            url = `http://localhost:3000/api/news/${currentEditId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert(currentEditId ? 'Cập nhật tin tức thành công!' : 'Thêm tin tức thành công!');
            closeEditModal();
            await loadNewsData();
        } else {
            alert('Lỗi: ' + (result.error || 'Không thể lưu tin tức'));
        }
    } catch (error) {
        console.error('Lỗi lưu tin tức:', error);
        alert('Lỗi khi lưu tin tức');
    }
}

/**
 * Delete a news item
 */
async function deleteNews() {
    if (!currentEditId) return;

    if (!confirm('Bạn chắc chắn muốn xóa tin tức này?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/news/${currentEditId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Xóa tin tức thành công!');
            closeEditModal();
            await loadNewsData();
        } else {
            alert('Lỗi khi xóa tin tức');
        }
    } catch (error) {
        console.error('Lỗi xóa tin tức:', error);
        alert('Lỗi khi xóa tin tức');
    }
}

/**
 * Setup image upload
 */
function setupImageUpload() {
    const dropZone = document.getElementById('image-drop-zone');
    const fileInput = document.getElementById('edit-image-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = '#e8f5e9';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.background = '#f9f9f9';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = '#f9f9f9';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageSelect(e.target.files[0]);
        }
    });
}

/**
 * Handle image selection
 */
function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn một file ảnh');
        return;
    }

    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const imagePreview = document.getElementById('image-preview');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

/**
 * Remove selected image
 */
function removeSelectedImage() {
    selectedImageFile = null;
    document.getElementById('edit-image-input').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
}

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('adminSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allNews.filter(news =>
            (news.tieuDe || '').toLowerCase().includes(searchTerm)
        );
        
        const tbody = document.getElementById('news-table-body');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Không tìm thấy kết quả</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(news => `
            <tr>
                <td>${news.id}</td>
                <td>${news.tieuDe || ''}</td>
                <td>${formatDate(news.ngay)}</td>
                <td>${(news.moTaNgan || '').substring(0, 50)}...</td>
                <td>
                    <button onclick="openEditModal(${news.id})" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    });
}

/**
 * Format date
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleDateString('vi-VN');
    } catch (error) {
        return dateString;
    }
}
