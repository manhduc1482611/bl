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

    // Gắn sự kiện cho Form lưu địa điểm
    const editForm = document.getElementById('edit-location-form');
    if (editForm) editForm.addEventListener('submit', saveLocation);

    // Gắn sự kiện cho nút Thêm địa điểm mới (nếu có trong HTML)
    const addBtn = document.getElementById('btn-add-location');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    // Gắn sự kiện cho các nút đóng Modal
    const closeButtons = document.querySelectorAll('.btn-close-modal, .btn-cancel');
    closeButtons.forEach(btn => btn.addEventListener('click', closeEditModal));

    // Đóng modal khi click ra ngoài vùng overlay
    const modal = document.getElementById('edit-modal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });
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

        // Thêm logic sắp xếp (Natural Sort)
        allLocations.sort((a, b) => {
            const codeA = a.location_code || '';
            const codeB = b.location_code || '';
            // Sử dụng localeCompare với numeric: true để hiểu số 10 lớn hơn số 2
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

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
    const locationCodeInput = document.getElementById('edit-location-code');
    if (!nodeIdInput) return;

    const nodeId = getNodeIdForBuilding(buildingName);
    nodeIdInput.value = nodeId || '';

    // Logic tự động điền mã địa điểm (chỉ chạy khi THÊM MỚI - editingOriginalCode === null)
    if (!editingOriginalCode && nodeId && locationCodeInput) {
        const nextCode = generateNextLocationCode(nodeId);
        locationCodeInput.value = nextCode;
    }
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
    document.getElementById('image-preview-container').style.display = 'none';
    
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
    
    // Hiển thị ảnh hiện tại từ thư mục tim-duong dựa trên cột image trong DB
    const preview = document.getElementById('image-preview');
    if (loc.image) {
        preview.src = `../../assets/images/pages/ban-do/tim-duong/${loc.image}?t=${Date.now()}`;
        document.getElementById('image-preview-container').style.display = 'block';
        preview.onerror = () => { document.getElementById('image-preview-container').style.display = 'none'; };
    } else {
        document.getElementById('image-preview-container').style.display = 'none';
    }

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

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const codeInput = document.getElementById('edit-location-code');
    const code = (codeInput?.value || '').trim().toUpperCase(); // Tự động viết hoa mã
    const isEdit = editingOriginalCode !== null;

    const building = document.getElementById('edit-building')?.value?.trim();
    const nodeId = document.getElementById('edit-node-id')?.value?.trim();
    const specificLocation = document.getElementById('edit-specific-location')?.value?.trim();
    const floor = document.getElementById('edit-floor')?.value?.trim();
    const description = document.getElementById('edit-description')?.value?.trim();

    if (!code) return alert('Vui lòng nhập Mã địa điểm.');
    if (!building) return alert('Vui lòng chọn tòa nhà.');

    // Vô hiệu hóa nút lưu để tránh bấm nhiều lần
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('building', building);
    formData.append('node_id', nodeId || ''); // Đảm bảo không gửi "undefined"
    formData.append('specific_location', specificLocation);
    formData.append('floor', floor);
    formData.append('description', description);
    formData.append('location_code', code);

    // Gửi file ảnh nếu có chọn mới
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
            const errorData = await response.json();
            alert(`Lỗi: ${errorData.error || 'Không thể lưu thông tin'}`);
        }
    } catch (error) {
        console.error("Lỗi API:", error);
        alert("Không thể kết nối đến máy chủ.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Hàm xử lý xóa địa điểm
async function deleteLocation() {
    const elCode = document.getElementById('edit-location-code');
    const code = elCode?.value;
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
function generateNextLocationCode(nodeId) {
    // Tiền tố mong muốn, ví dụ: "1_"
    const prefix = nodeId + "_";

    // Lọc ra tất cả các location_code hiện có bắt đầu bằng "nodeId_"
    const relatedCodes = allLocations
        .map(loc => loc.location_code)
        .filter(code => code && code.startsWith(prefix));

    if (relatedCodes.length === 0) {
        // Nếu chưa có mã nào cho node này, bắt đầu từ 1_1
        return prefix + "1";
    }

    // Tách lấy phần số sau dấu "_" và chuyển thành số nguyên
    const suffixes = relatedCodes.map(code => {
        const parts = code.split('_');
        const lastPart = parts[parts.length - 1]; // Lấy phần cuối sau dấu gạch dưới
        return parseInt(lastPart, 10);
    }).filter(num => !isNaN(num)); // Loại bỏ các giá trị không phải số

    // Tìm số lớn nhất và cộng thêm 1
    const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0;
    return prefix + (maxSuffix + 1);
}
/* ========================================================
   LOGIC THANH TÌM KIẾM ĐỊA ĐIỂM (DÀNH CHO ADMIN)
======================================================== */
const adminSearchInput = document.getElementById('adminSearchInput');
const adminSearchResults = document.getElementById('adminSearchResults');

if (adminSearchInput && adminSearchResults) {
    adminSearchInput.addEventListener('input', function () {
        const keyword = this.value.toLowerCase().trim();
        adminSearchResults.innerHTML = '';
        
        const rows = document.querySelectorAll('#location-table-body tr');

        // Nếu ô tìm kiếm trống, hiện lại toàn bộ bảng và ẩn dropdown
        if (keyword.length === 0) { 
            adminSearchResults.style.display = 'none'; 
            rows.forEach(tr => tr.style.display = '');
            return; 
        }

        let foundAny = false;
        let dedupedResults = new Set(); // Dùng Set để tránh lặp kết quả trong dropdown

        rows.forEach(row => {
            // Bỏ qua dòng thông báo "Đang tải dữ liệu..." hoặc dòng trống
            if (row.cells.length < 3) return;

            const locCode = row.cells[0].innerText.toLowerCase();
            const building = row.cells[1].innerText.toLowerCase();
            const locName = row.cells[2].innerText.toLowerCase();
            
            const originalName = row.cells[2].innerText;
            const originalBuilding = row.cells[1].innerText;
            const dropdownKey = `${originalName} - ${originalBuilding}`;

            // Kiểm tra xem từ khóa có khớp với Mã, Tòa nhà hoặc Tên địa điểm không
            if (locCode.includes(keyword) || building.includes(keyword) || locName.includes(keyword)) {
                foundAny = true;
                row.style.display = ''; // Hiện dòng trong bảng
                
                // Thêm vào dropdown gợi ý (nếu chưa có)
                if (!dedupedResults.has(dropdownKey)) {
                    dedupedResults.add(dropdownKey);
                    
                    const li = document.createElement('li');
                    li.style.padding = '12px 15px';
                    li.style.borderBottom = '1px solid #eee';
                    li.style.cursor = 'pointer';
                    li.style.display = 'flex';
                    li.style.alignItems = 'center';
                    li.style.color = '#333';
                    
                    li.innerHTML = `
                        <i class="fas fa-map-marker-alt" style="color: #e74c3c; margin-right: 12px; font-size: 16px;"></i>
                        <div>
                            <div style="font-weight: bold;">${originalName}</div>
                            <div style="font-size: 12px; color: #666;">Tòa nhà: ${originalBuilding}</div>
                        </div>
                    `;
                    
                    // Logic khi click vào một gợi ý trong dropdown
                    li.onclick = (e) => {
                        e.stopPropagation();
                        adminSearchInput.value = originalName;
                        adminSearchResults.style.display = 'none';
                        
                        // Lọc bảng để chỉ giữ lại dòng tương ứng với lựa chọn
                        rows.forEach(r => {
                            if (r === row) {
                                r.style.display = '';
                            } else if (r.cells.length >= 3) {
                                r.style.display = 'none';
                            }
                        });
                    };
                    
                    // Hiệu ứng hover
                    li.onmouseover = () => li.style.background = '#f9f9f9';
                    li.onmouseout = () => li.style.background = 'white';

                    adminSearchResults.appendChild(li);
                }
            } else {
                row.style.display = 'none'; // Ẩn dòng không khớp trong bảng
            }
        });

        // Xử lý hiển thị dropdown
        if (foundAny) {
            adminSearchResults.style.display = 'block';
        } else {
            adminSearchResults.innerHTML = '<li style="padding: 15px; color: #999; text-align: center;">Không tìm thấy địa điểm nào phù hợp</li>';
            adminSearchResults.style.display = 'block';
        }
    });

    // Ẩn dropdown khi click ra ngoài vùng tìm kiếm
    document.addEventListener('click', function (e) {
        if (!adminSearchInput.contains(e.target) && !adminSearchResults.contains(e.target)) {
            adminSearchResults.style.display = 'none';
        }
    });
}