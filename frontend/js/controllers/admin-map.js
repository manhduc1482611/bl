const API_BASE = 'http://localhost:3000/api';
let allLocations = []; // Biến lưu trữ cục bộ để truy xuất dữ liệu khi nhấn "Sửa"
let selectedImageFile = null;
let buildingNodeMap = {}; // Map từ building -> node_id tự động
let editingOriginalCode = null; // Lưu mã gốc khi đang chỉnh sửa

document.addEventListener('DOMContentLoaded', async function () {
    // Kiểm tra quyền truy cập (Người dùng phải đăng nhập và là admin_web)
    const user = JSON.parse(localStorage.getItem('hvnh_current_user'));
    if (!user || user.acc_type !== 'admin_web') {
        alert('Chỉ tài khoản admin_web mới được phép truy cập trang quản trị.');
        localStorage.removeItem('hvnh_current_user');
        window.location.href = '../dangnhap.html';
        return;
    }

    await loadLocationList();
    initImageUpload();

    const buildingSelect = document.getElementById('edit-building');
    if (buildingSelect) {
        buildingSelect.addEventListener('change', function () {
            updateSelectedNodeId(this.value);
        });
    }
});

function initImageUpload() {
    const dropZone = document.getElementById('image-drop-zone');
    const fileInput = document.getElementById('edit-image-input');

    if (!dropZone || !fileInput) return;

    dropZone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => handleFiles(e.target.files);

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = '#003478'; dropZone.style.background = '#f0f4f8'; };
    dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.style.borderColor = '#ccc'; dropZone.style.background = '#f9f9f9'; };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f9f9f9';
        handleFiles(e.dataTransfer.files);
    };
}

function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return alert('Vui lòng chỉ chọn file ảnh!');

    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('image-preview');
        preview.src = e.target.result;
        document.getElementById('image-preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeSelectedImage() {
    selectedImageFile = null;
    document.getElementById('edit-image-input').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
}

async function loadLocationList() {
    const tableBody = document.getElementById('location-table-body');
    
    try {
        const response = await fetch(`${API_BASE}/map-data`);
        const data = await response.json();
        allLocations = data.locations || [];
        const nodes = data.nodes || [];

        populateBuildingDropdown(nodes);

        if (allLocations.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không có dữ liệu.</td></tr>';
            return;
        }

        tableBody.innerHTML = allLocations.map(loc => `
            <tr>
                <td><strong>${loc.location_code}</strong></td>
                <td>${loc.building || '-'}</td>
                <td>${loc.specific_location || '-'}</td>
                <td>${loc.floor || '-'}</td>
                <td class="td-desc" title="${loc.description || ''}">${loc.description || '-'}</td>
                <td>
                    <select class="status-select ${loc.type == 1 ? 'active' : 'hidden'}" onchange="updateSearchType('${loc.location_code}', this.value, this)">
                        <option value="1" ${loc.type == 1 ? 'selected' : ''}>Có (Hiện)</option>
                        <option value="null" ${loc.type == null ? 'selected' : ''}>Không (Ẩn)</option>
                    </select>
                </td>
                <td>
                    <button class="btn-edit" onclick="openEditModal('${loc.location_code}')">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error("Lỗi tải danh sách:", error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Lỗi kết nối Server.</td></tr>';
    }
}

// Hàm đổ danh sách tòa nhà vào dropdown
function populateBuildingDropdown(nodes) {
    const select = document.getElementById('edit-building');
    if (!select) return;

    // Lấy danh sách tên tòa nhà duy nhất từ các node loại 'red'
    const buildings = [...new Set(nodes
        .filter(n => (n.node_type || n.type || '').toLowerCase() === 'red')
        .map(n => n.name)
    )].filter(Boolean).sort();

    buildingNodeMap = nodes.reduce((map, n) => {
        if (!n.name) return map;
        const key = String(n.name).trim();
        if (!map[key]) map[key] = [];
        map[key].push(String(n.id));
        return map;
    }, {});

    select.innerHTML = '<option value="">-- Chọn tòa nhà --</option>' + 
        buildings.map(b => `<option value="${b}">${b}</option>`).join('');
}

function ensureBuildingOption(buildingName) {
    const select = document.getElementById('edit-building');
    if (!select || !buildingName) return;
    const optionExists = Array.from(select.options).some(option => option.value === buildingName);
    if (!optionExists) {
        const option = document.createElement('option');
        option.value = buildingName;
        option.text = buildingName;
        select.appendChild(option);
    }
}

function getNodeIdForBuilding(buildingName) {
    if (!buildingName || !buildingNodeMap[buildingName]) return null;
    const ids = buildingNodeMap[buildingName];
    const preferred = ids.find(id => id.endsWith('.1'));
    return preferred || ids[0] || null;
}

function updateSelectedNodeId(buildingName) {
    const nodeIdInput = document.getElementById('edit-node-id');
    if (!nodeIdInput) return;
    const nodeId = getNodeIdForBuilding(buildingName);
    nodeIdInput.value = nodeId || '';
}

async function updateSearchType(code, value, selectEl) {
    const typeValue = value === 'null' ? null : parseInt(value);
    
    // Cập nhật class để đổi màu ngay lập tức trên UI
    if (selectEl) {
        selectEl.className = `status-select ${typeValue === 1 ? 'active' : 'hidden'}`;
    }

    try {
        const response = await fetch(`${API_BASE}/locations/${code}/type`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: typeValue })
        });

        if (response.ok) {
            showToast(`Đã cập nhật ID ${code}`);
        } else {
            alert("Lỗi khi cập nhật trạng thái.");
        }
    } catch (error) {
        console.error("Lỗi API:", error);
        alert("Không thể kết nối đến máy chủ.");
    }
}

// Hàm mở Modal để thêm địa điểm mới
function openAddModal() {
    editingOriginalCode = null;
    const codeInput = document.getElementById('edit-location-code');
    if (codeInput) {
        codeInput.value = '';
        codeInput.disabled = false; // Cho phép nhập mã khi thêm mới
    }

    removeSelectedImage();

    const deleteBtn = document.getElementById('btn-delete-location');
    if (deleteBtn) deleteBtn.style.display = 'none'; // Ẩn nút xóa khi thêm mới

    document.getElementById('edit-building').value = '';
    updateSelectedNodeId('');
    document.getElementById('edit-specific-location').value = '';
    document.getElementById('edit-floor').value = '';
    document.getElementById('edit-description').value = '';
    
    const modalTitle = document.querySelector('#edit-modal h3');
    if (modalTitle) modalTitle.innerText = 'Thêm địa điểm mới';

    document.getElementById('edit-modal').style.display = 'flex';
}

// Hàm mở Modal và điền thông tin hiện tại vào Form
function openEditModal(code) {
    const loc = allLocations.find(l => l.location_code === code);
    if (!loc) return;

    editingOriginalCode = code;
    const codeInput = document.getElementById('edit-location-code');
    if (codeInput) {
        codeInput.value = loc.location_code;
        codeInput.disabled = false; // Cho phép sửa mã khi đang biên tập
    }

    removeSelectedImage();
    // Hiển thị ảnh hiện tại nếu có
    const preview = document.getElementById('image-preview');
    preview.src = `../../assets/images/pages/ban-do/toa-nha/${loc.location_code}.jpg?t=${Date.now()}`;
    document.getElementById('image-preview-container').style.display = 'block';
    preview.onerror = () => { document.getElementById('image-preview-container').style.display = 'none'; };

    const deleteBtn = document.getElementById('btn-delete-location');
    if (deleteBtn) deleteBtn.style.display = 'block'; // Hiện nút xóa khi chỉnh sửa

    ensureBuildingOption(loc.building);
    document.getElementById('edit-building').value = loc.building || '';
    updateSelectedNodeId(loc.building || '');
    document.getElementById('edit-specific-location').value = loc.specific_location || '';
    document.getElementById('edit-floor').value = loc.floor || '';
    document.getElementById('edit-description').value = loc.description || '';
    
    const modalTitle = document.querySelector('#edit-modal h3');
    if (modalTitle) modalTitle.innerText = 'Chỉnh sửa địa điểm';

    document.getElementById('edit-modal').style.display = 'flex';
}

// Hàm đóng Modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Hàm gửi yêu cầu lưu thông tin đã sửa lên Server
async function saveLocation(event) {
    if (event) event.preventDefault();
    const codeInput = document.getElementById('edit-location-code');
    const code = (codeInput.value || '').trim();
    const isEdit = editingOriginalCode !== null;

    const building = (document.getElementById('edit-building').value || '').trim();
    const nodeId = (document.getElementById('edit-node-id').value || '').trim();
    const specificLocation = (document.getElementById('edit-specific-location').value || '').trim();
    const floor = (document.getElementById('edit-floor').value || '').trim();
    const description = (document.getElementById('edit-description').value || '').trim();

    if (!code) {
        alert('Mã địa điểm không được bỏ trống.');
        return;
    }
    if (!building) {
        alert('Vui lòng chọn tòa nhà.');
        return;
    }

    const formData = new FormData();
    formData.append('building', building);
    formData.append('node_id', nodeId);
    formData.append('specific_location', specificLocation);
    formData.append('floor', floor);
    formData.append('description', description);
    
    formData.append('location_code', code); // Luôn gửi mã địa điểm (có thể là mã mới)

    if (selectedImageFile) {
        formData.append('image', selectedImageFile);
    }

    let url = `${API_BASE}/locations`;
    let method = 'POST';

    if (isEdit) {
        url = `${API_BASE}/locations/${editingOriginalCode}`;
        method = 'PUT';
    } else {
        formData.append('type', 1);
    }

    try {
        const response = await fetch(url, {
            method: method,
            body: formData // Gửi formData thay vì JSON
        });

        if (response.ok) {
            showToast(isEdit ? `Đã cập nhật thông tin ${code}` : `Đã thêm địa điểm ${code}`);
            closeEditModal();
            loadLocationList(); // Tải lại bảng để cập nhật dữ liệu mới
        } else {
            const errorText = await response.text();
            console.error("Lỗi lưu thông tin:", response.status, errorText);
            alert(`Lỗi khi lưu thông tin. (${response.status}) ${errorText}`);
        }
    } catch (error) {
        console.error("Lỗi API:", error);
        alert("Không thể kết nối đến máy chủ.");
    }
}

// Hàm xử lý xóa địa điểm
async function deleteLocation() {
    const code = document.getElementById('edit-location-code').value;
    if (!code) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa địa điểm ${code}? Hành động này không thể hoàn tác.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/locations/${code}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast(`Đã xóa địa điểm ${code}`);
            closeEditModal();
            loadLocationList(); // Tải lại danh sách
        } else {
            const errorText = await response.text();
            alert(`Lỗi khi xóa: ${errorText}`);
        }
    } catch (error) {
        console.error("Lỗi API xóa:", error);
        alert("Không thể kết nối đến máy chủ.");
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}