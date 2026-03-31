/**
 * FILE: js/controllers/ban-do/toa-nha/toa-nha.js
 * MÔ TẢ: Xử lý hiển thị chi tiết hình ảnh và thông tin (Tòa nhà, Tầng, Mô tả)
 */

let buildingLocations = []; // Danh sách các phòng/vị trí trong tòa nhà
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const destId = urlParams.get('id');
    if (!destId) return;

    // 1. Tải dữ liệu từ API
    // Thêm timestamp để ép trình duyệt tải dữ liệu mới nhất
    const response = await fetch(`http://localhost:3000/api/map-data?t=${Date.now()}`).catch(() => null);
    if (!response) return;
    const mapData = await response.json();

    // 2. LOGIC LỌC THÔNG MINH: Tìm tên tòa nhà từ Node ID
    const destIdStr = String(destId);
    
    // Tìm đối tượng Node tương ứng để lấy tên tòa nhà (VD: từ ID 7 lấy được tên 'D1')
    const nodesArray = Array.isArray(mapData.nodes) ? mapData.nodes : Object.values(mapData.nodes || {});
    const targetNode = nodesArray.find(n => String(n.id || n.node_id) === destIdStr);
    const nodeName = targetNode ? (targetNode.name || '') : '';

    // Tiền tố tòa nhà nếu là mã phòng (VD: 'A1' từ 'A1_101')
    const buildingPrefix = destIdStr.includes('_') ? destIdStr.split('_')[0] : '';
    
    buildingLocations = (mapData.locations || []).filter(loc => 
        String(loc.node_id) === destIdStr ||                         // Khớp ID nút
        String(loc.location_code) === destIdStr ||                  // Khớp mã địa điểm
        (nodeName && String(loc.building) === nodeName) ||          // Khớp tên tòa nhà
        (buildingPrefix && String(loc.building) === buildingPrefix) // Khớp tiền tố
    );

    if (buildingLocations.length === 0) return;

    // Tìm vị trí của địa điểm cụ thể trong mảng để hiển thị ảnh đó trước
    const startIdx = buildingLocations.findIndex(l => l.location_code === destId);
    currentIndex = startIdx !== -1 ? startIdx : 0;

    // 3. Hiển thị thông tin lần đầu
    updateDisplay();

    // 4. Gắn sự kiện cho các nút chuyển ảnh (Nếu bạn có nút Next/Prev trong HTML)
    const btnNext = document.getElementById('next-btn');
    const btnPrev = document.getElementById('prev-btn');

    if (btnNext) btnNext.onclick = () => changeImage(1);
    if (btnPrev) btnPrev.onclick = () => changeImage(-1);
});

function changeImage(step) {
    currentIndex += step;
    if (currentIndex >= buildingLocations.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = buildingLocations.length - 1;
    
    updateDisplay();
}

function updateDisplay() {
    const loc = buildingLocations[currentIndex];
    if (!loc) return;

    // Cập nhật Hình ảnh
    const imgEl = document.getElementById('display-image');
    if (imgEl) {
        // Đường dẫn ảnh giả định: assets/images/pages/ban-do/toa-nha/{location_code}.jpg
        imgEl.src = `../../assets/images/pages/ban-do/toa-nha/${loc.location_code}.jpg`;
        imgEl.onerror = () => { imgEl.src = '../../assets/images/common/no-image.jpg'; };
    }

    // CẬP NHẬT CÁC NHÃN CHỮ (Sửa lỗi "giữ nguyên thông tin ảnh đầu")
    // Hãy đảm bảo các ID này trùng với ID trong file HTML của bạn
    const labels = {
        'info-building': loc.building || '-',
        'info-location': loc.specific_location || '-',
        'info-floor': loc.floor || '-',
        'info-description': loc.description || 'Không có mô tả.'
    };

    for (let id in labels) {
        const el = document.getElementById(id);
        if (el) {
            // Sử dụng textContent để đảm bảo ghi đè sạch dữ liệu cũ
            el.textContent = labels[id];
            // Thêm hiệu ứng nháy nhẹ để người dùng biết thông tin đã đổi
            el.classList.add('flash-update');
            setTimeout(() => el.classList.remove('flash-update'), 300);
        }
    }

    // Cập nhật chỉ số (vd: 1/5)
    const counterEl = document.getElementById('image-counter');
    if (counterEl) {
        counterEl.innerText = `${currentIndex + 1} / ${buildingLocations.length}`;
    }
}