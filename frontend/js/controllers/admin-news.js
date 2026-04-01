const API_BASE = 'http://localhost:3000/api';
let allNews = [];
let editingNewsId = null;

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Kiểm tra quyền admin_web
    const user = JSON.parse(localStorage.getItem('hvnh_current_user'));
    if (!user || user.acc_type !== 'admin_web') {
        alert('Chỉ tài khoản admin_web mới được phép truy cập trang quản trị tin tức.');
        window.location.href = '../dangnhap.html';
        return;
    }

    await loadNewsList();

    // 2. Gắn sự kiện cho nút Thêm tin tức (ID: btn-add-news)
    const addBtn = document.getElementById('btn-add-news');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    // 3. Gắn sự kiện cho Form lưu tin tức
    const newsForm = document.getElementById('edit-news-form');
    if (newsForm) newsForm.addEventListener('submit', saveNews);

    // 4. Các nút đóng Modal
    const closeButtons = document.querySelectorAll('.btn-close-modal, .btn-cancel');
    closeButtons.forEach(btn => btn.addEventListener('click', closeNewsModal));
});

async function loadNewsList() {
    const tableBody = document.getElementById('news-table-body');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE}/news`);
        const data = await response.json();
        allNews = data.news || [];

        tableBody.innerHTML = allNews.map(item => `
            <tr>
                <td>${item.id}</td>
                <td><strong>${item.tieuDe}</strong></td>
                <td>${item.ngay || '-'}</td>
                <td>${item.luotXem || 0}</td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${item.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn-delete" onclick="deleteNews(${item.id})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-left:5px;">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Lỗi tải danh sách tin tức:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Lỗi kết nối Server.</td></tr>';
    }
}

function openAddModal() {
    editingNewsId = null;
    document.getElementById('news-modal-title').innerText = 'Thêm tin tức mới';
    document.getElementById('edit-news-form').reset();
    document.getElementById('news-modal').style.display = 'flex';
}

function openEditModal(id) {
    const news = allNews.find(n => n.id === id);
    if (!news) return;

    editingNewsId = id;
    document.getElementById('news-modal-title').innerText = 'Chỉnh sửa tin tức';
    
    document.getElementById('news-title').value = news.tieuDe || '';
    document.getElementById('news-date').value = news.ngay || '';
    document.getElementById('news-summary').value = news.moTaNgan || '';
    // Hiển thị nội dung dạng JSON để admin có thể sửa cấu trúc blocks
    document.getElementById('news-blocks').value = news.blocks ? 
        (typeof news.blocks === 'string' ? news.blocks : JSON.stringify(news.blocks, null, 2)) : '[]';

    document.getElementById('news-modal').style.display = 'flex';
}

function closeNewsModal() {
    document.getElementById('news-modal').style.display = 'none';
}

async function saveNews(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    const tieuDe = document.getElementById('news-title').value.trim();
    const ngay = document.getElementById('news-date').value.trim();
    const moTaNgan = document.getElementById('news-summary').value.trim();
    const blocksRaw = document.getElementById('news-blocks').value.trim();
    const imageFile = document.getElementById('news-image').files[0];

    if (!tieuDe) return alert('Vui lòng nhập tiêu đề bài viết.');

    const formData = new FormData();
    formData.append('tieuDe', tieuDe);
    formData.append('ngay', ngay);
    formData.append('moTaNgan', moTaNgan);
    formData.append('blocks', blocksRaw || '[]');
    if (imageFile) formData.append('anhDaiDien', imageFile);

    if (submitBtn) submitBtn.disabled = true;

    let url = `${API_BASE}/news`;
    let method = 'POST';

    if (editingNewsId) {
        url = `${API_BASE}/news/${editingNewsId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, { method: method, body: formData });

        if (response.ok) {
            alert(editingNewsId ? 'Đã cập nhật tin tức thành công!' : 'Đã thêm tin tức thành công!');
            closeNewsModal();
            loadNewsList();
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.error || 'Không thể lưu tin tức'}`);
        }
    } catch (error) {
        console.error("Lỗi API saveNews:", error);
        alert("Không thể kết nối đến máy chủ.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteNews(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không? Dữ liệu sẽ mất vĩnh viễn.')) return;

    try {
        const response = await fetch(`${API_BASE}/news/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Đã xóa tin tức.');
            loadNewsList();
        } else {
            alert('Lỗi khi xóa tin tức khỏi database.');
        }
    } catch (error) {
        console.error("Lỗi API xóa tin tức:", error);
        alert("Không thể kết nối đến máy chủ.");
    }
}