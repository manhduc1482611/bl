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
        
        // Vẽ lại mạng lưới đường và điểm khi người dùng thay đổi kích thước màn hình
        if (window.mapData && window.mapData.nodes && window.mapData.connections) {
            drawAllConnections(window.mapData.nodes, window.mapData.connections);
            drawAllRedNodes(window.mapData.nodes);
        }
    }
    window.addEventListener('resize', resize);
    resize();
}

/**
 * HÀM MỚI: VẼ TOÀN BỘ CÁC ĐƯỜNG NỐI (MẠNG LƯỚI ĐƯỜNG ĐI)
 */
function drawAllConnections(nodes, connections) {
    if (!ctx || !canvas || !connections) return;

    ctx.beginPath();
    ctx.lineWidth = 2; // Độ dày của đường nối nền
    // Màu đỏ nhưng hơi mờ (opacity 0.5) để không lấn át đường đi chính lúc tìm đường
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    connections.forEach(([p1, p2]) => {
        if (nodes[p1] && nodes[p2]) {
            const x1 = (nodes[p1].x / 100) * canvas.width;
            const y1 = (nodes[p1].y / 100) * canvas.height;
            const x2 = (nodes[p2].x / 100) * canvas.width;
            const y2 = (nodes[p2].y / 100) * canvas.height;
            
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
    });
    ctx.stroke();
}

/**
 * VẼ CÁC ĐIỂM NỐI ĐỎ (Chấm tròn)
 */
function drawAllRedNodes(nodes) {
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#e74c3c'; 
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 1.5;

    for (let id in nodes) {
        const node = nodes[id];
        if (!node.type || node.type.toLowerCase() === 'red') {
            const px = (node.x / 100) * canvas.width;
            const py = (node.y / 100) * canvas.height;

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, 2 * Math.PI); 
            ctx.fill();
            ctx.stroke(); 
        }
    }
}

/**
 * HÀM VẼ TRẠNG THÁI BẢN ĐỒ (Khi video đang chạy)
 */
function drawMapState(fullPath, uId, vId, nodes, progress) {
    // 1. Xóa sạch canvas cũ
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. VẼ LẠI NỀN ĐƯỜNG & ĐIỂM CHỜ (Để chúng không biến mất khi đang lướt video)
    if (window.mapData && window.mapData.connections) {
        drawAllConnections(nodes, window.mapData.connections);
        drawAllRedNodes(nodes);
    }

    if (!fullPath || fullPath.length < 2) return;

    // 3. VẼ ĐƯỜNG TÌM ĐƯỜNG HIỆN TẠI (Đỏ đậm hơn, to hơn đè lên nền)
    ctx.beginPath();
    ctx.lineWidth = 5; 
    ctx.strokeStyle = '#e74c3c'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    fullPath.forEach((id, i) => {
        const px = (nodes[id].x / 100) * canvas.width;
        const py = (nodes[id].y / 100) * canvas.height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 4. TÍNH VỊ TRÍ CON TRỎ
    if (nodes[uId] && nodes[vId]) {
        const p1 = nodes[uId];
        const p2 = nodes[vId];

        const p1x = (p1.x / 100) * canvas.width;
        const p1y = (p1.y / 100) * canvas.height;
        
        const p2x = (p2.x / 100) * canvas.width;
        const p2y = (p2.y / 100) * canvas.height;

        const curX = p1x + (p2x - p1x) * progress;
        const curY = p1y + (p2y - p1y) * progress;

        // Vẽ con trỏ nhấp nháy
        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2c3e50';
        ctx.stroke();
    }
}