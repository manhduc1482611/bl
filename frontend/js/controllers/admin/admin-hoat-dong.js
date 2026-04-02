/* =================================================================
   FILE: js/controllers/admin/admin-hoat-dong.js
   MÔ TẢ: Admin controller quản lý hoạt động
   ================================================================= */

let allActivities = [];
let allNodes = [];
let currentEditId = null;
let selectedImageFile = null;

/**
 * Initialize the activity admin page
 */
async function initializeActivityAdmin() {
    try {
        await loadNodesData();
        setupImageUpload();
        await loadActivityData();
        setupSearch();
    } catch (error) {
        console.error('Lỗi khởi tạo trang admin hoạt động:', error);
    }
}

/**
 * Load nodes data for dropdown
 */
async function loadNodesData() {
    try {
        console.log('Đang tải dữ liệu tòa nhà...');
        const response = await fetch('http://localhost:3000/api/map-data');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dữ liệu tòa nhà:', data.nodes);
        
        allNodes = data.nodes || [];
        console.log('Số tòa nhà được tải:', allNodes.length);
        
        populateToaDropdown();
    } catch (error) {
        console.error('Lỗi tải dữ liệu tòa nhà:', error);
    }
}

/**
 * Populate toa dropdown
 */
function populateToaDropdown() {
    const select = document.getElementById('edit-toa');
    if (!select) return;

    // Keep the default option
    const defaultOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(defaultOption);

    allNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = node.name || node.id;
        select.appendChild(option);
    });
}

/**
 * Load all activities data from API
 */
async function loadActivityData() {
    try {
        console.log('Đang tải dữ liệu hoạt động từ API...');
        const response = await fetch('http://localhost:3000/api/activities');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dữ liệu hoạt động nhận được:', data);
        
        allActivities = Array.isArray(data.activities) ? data.activities : [];
        console.log('Số hoạt động được tải:', allActivities.length);
        
        displayActivityTable();
    } catch (error) {
        console.error('Lỗi tải dữ liệu hoạt động:', error);
        const tbody = document.getElementById('activity-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Lỗi: ${error.message}</td></tr>`;
        }
    }
}

/**
 * Display activities in table
 */
function displayActivityTable() {
    const tbody = document.getElementById('activity-table-body');
    if (!tbody) return;

    if (allActivities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Không có hoạt động nào</td></tr>';
        return;
    }

    tbody.innerHTML = allActivities.map(activity => `
        <tr>
            <td>${activity.MHD}</td>
            <td>${activity.THD || ''}</td>
            <td>${formatDateTime(activity.Time)}</td>
            <td>${activity.Phong || ''}</td>
            <td>${activity.tenToa || ''}</td>
            <td>
                <button onclick="openEditModal('${activity.MHD}')" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Open edit modal for an activity
 */
async function openEditModal(mhd) {
    try {
        const response = await fetch(`http://localhost:3000/api/activities/${mhd}`);
        const data = await response.json();
        const activity = data.activity;

        currentEditId = mhd;
        document.getElementById('edit-mhd').value = activity.MHD || mhd;
        document.getElementById('edit-mhd').disabled = true;
        document.getElementById('mhd-field-group').style.display = 'none';
        document.getElementById('edit-thd').value = activity.THD || '';
        document.getElementById('edit-time').value = formatDateTimeForInput(activity.Time) || '';
        document.getElementById('edit-phong').value = activity.Phong || '';
        document.getElementById('edit-toa').value = activity.Toa || '';
        document.getElementById('edit-mo-ta').value = activity.MoTa || '';
        
        // Show delete button when editing
        document.getElementById('btn-delete-activity').style.display = 'block';

        // Show image preview if exists
        if (activity.Anh) {
            const imagePreviewContainer = document.getElementById('image-preview-container');
            const imagePreview = document.getElementById('image-preview');
            let imageSrc = activity.Anh;
            if (!imageSrc.startsWith('http') && !imageSrc.startsWith('/')) {
                imageSrc = `../../assets/images/pages/hoat-dong/${imageSrc}`;
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
 * Open add modal for new activity
 */
function openAddModal() {
    currentEditId = null;
    document.getElementById('edit-mhd').value = '';
    document.getElementById('edit-mhd').disabled = false;
    document.getElementById('mhd-field-group').style.display = 'block';
    document.getElementById('edit-thd').value = '';
    document.getElementById('edit-time').value = new Date().toISOString().slice(0, 16);
    document.getElementById('edit-phong').value = '';
    document.getElementById('edit-toa').value = '';
    document.getElementById('edit-mo-ta').value = '';
    document.getElementById('btn-delete-activity').style.display = 'none';
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
 * Save activity (add or update)
 */
async function saveActivity(event) {
    event.preventDefault();

    let MHD = document.getElementById('edit-mhd')?.value;
    const THD = document.getElementById('edit-thd').value;
    const Time = document.getElementById('edit-time').value;
    const Phong = document.getElementById('edit-phong').value;
    const Toa = document.getElementById('edit-toa').value;
    const MoTa = document.getElementById('edit-mo-ta').value;

    if (!THD || !Time || !Toa || !MoTa || (!currentEditId && !MHD)) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }

    // If editing, use currentEditId as MHD
    if (currentEditId && !MHD) {
        MHD = currentEditId;
    }

    try {
        const formData = new FormData();
        formData.append('MHD', MHD);
        formData.append('THD', THD);
        formData.append('Time', Time);
        formData.append('Phong', Phong);
        formData.append('Toa', Toa);
        formData.append('MoTa', MoTa);
        
        if (selectedImageFile) {
            formData.append('Anh', selectedImageFile);
        }

        let url = 'http://localhost:3000/api/activities';
        let method = 'POST';

        if (currentEditId) {
            url = `http://localhost:3000/api/activities/${currentEditId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert(currentEditId ? 'Cập nhật hoạt động thành công!' : 'Thêm hoạt động thành công!');
            closeEditModal();
            await loadActivityData();
        } else {
            alert('Lỗi: ' + (result.error || 'Không thể lưu hoạt động'));
        }
    } catch (error) {
        console.error('Lỗi lưu hoạt động:', error);
        alert('Lỗi khi lưu hoạt động');
    }
}

/**
 * Delete an activity
 */
async function deleteActivity() {
    if (!currentEditId) return;

    if (!confirm('Bạn chắc chắn muốn xóa hoạt động này?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/activities/${currentEditId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Xóa hoạt động thành công!');
            closeEditModal();
            await loadActivityData();
        } else {
            alert('Lỗi khi xóa hoạt động');
        }
    } catch (error) {
        console.error('Lỗi xóa hoạt động:', error);
        alert('Lỗi khi xóa hoạt động');
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
        const filtered = allActivities.filter(activity =>
            (activity.THD || '').toLowerCase().includes(searchTerm)
        );
        
        const tbody = document.getElementById('activity-table-body');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không tìm thấy kết quả</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(activity => `
            <tr>
                <td>${activity.id}</td>
                <td>${activity.THD || ''}</td>
                <td>${formatDateTime(activity.Time)}</td>
                <td>${activity.Phong || ''}</td>
                <td>${activity.tenToa || ''}</td>
                <td>
                    <button onclick="openEditModal(${activity.id})" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    });
}

/**
 * Format date time for display
 */
function formatDateTime(dateTimeString) {
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date)) return dateTimeString;
        return date.toLocaleString('vi-VN');
    } catch (error) {
        return dateTimeString;
    }
}

/**
 * Format date time for input field
 */
function formatDateTimeForInput(dateTimeString) {
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date)) return '';
        return date.toISOString().slice(0, 16);
    } catch (error) {
        return '';
    }
}
