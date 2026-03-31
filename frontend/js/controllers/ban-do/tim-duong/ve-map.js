/**
 * FILE: js/controllers/ban-do/tim-duong/ve-map.js
 */
let ctx, canvas;

function initCanvas(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();
}

/**
 * HÀM VẼ TRẠNG THÁI BẢN ĐỒ
 * @param {Array} fullPath - Danh sách toàn bộ các điểm (VD: [2, F4, F5, 3])
 * @param {string} uId - ID điểm đầu của đoạn ĐANG chạy
 * @param {string} vId - ID điểm cuối của đoạn ĐANG chạy
 * @param {Object} nodes - Dữ liệu tọa độ các điểm
 * @param {number} progress - Tiến độ của đoạn hiện tại (0.0 -> 1.0)
 */
function drawMapState(fullPath, uId, vId, nodes, progress) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!fullPath || fullPath.length < 2) return;

    const getPos = (node) => {
        if (!node) return null;
        const x = parseFloat(node.pos_x ?? node.x ?? node.X);
        const y = parseFloat(node.pos_y ?? node.y ?? node.Y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
    };

    // 2. VẼ ĐƯỜNG MÀU ĐỎ
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = fullPath
        .map(id => ({ id, pos: getPos(nodes[id]) }))
        .filter(item => item.pos);

    if (points.length < 2) return;

    points.forEach((item, index) => {
        const px = (item.pos.x / 100) * canvas.width;
        const py = (item.pos.y / 100) * canvas.height;

        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 3. TÍNH VỊ TRÍ CON TRỎ (Nội suy)
    const p1 = getPos(nodes[uId]);
    const p2 = getPos(nodes[vId]);
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    if (p1 && p2) {
        const p1x = (p1.x / 100) * canvas.width;
        const p1y = (p1.y / 100) * canvas.height;
        const p2x = (p2.x / 100) * canvas.width;
        const p2y = (p2.y / 100) * canvas.height;

        const curX = p1x + (p2x - p1x) * safeProgress;
        const curY = p1y + (p2y - p1y) * safeProgress;

        // 4. VẼ CON TRỎ
        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#f39c12';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }
}
// Hàm hỗ trợ vẽ đường tĩnh ban đầu (khi chưa chạy video)
function drawStaticPath(path, nodes) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!path || path.length < 2) return;

    // Gọi hàm chính với progress = 0 ở đoạn đầu tiên
    drawMapState(path, path[0], path[1], nodes, 0);
}