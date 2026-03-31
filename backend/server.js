const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getMapData, getNewsData, getNewsById, getAccounts, updateLocationType, addLocation, updateLocation, deleteLocation } = require('./dbOperations');
require('dotenv').config();

const app = express();

// Middleware quan trọng
app.use(cors()); // Cho phép Frontend (VD: Live Server) gọi API không bị chặn lỗi CORS
app.use(express.json()); 

const uploadPath = path.join(__dirname, '../frontend/assets/images/pages/ban-do/toa-nha');
function ensureUploadPath() {
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
}

function sanitizeFileName(name) {
    return String(name || '').replace(/[^a-zA-Z0-9-_\.]/g, '_');
}

// Cấu hình nơi lưu trữ ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureUploadPath();
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const rawCode = req.body.location_code || req.params.code;
        const locationCode = sanitizeFileName(rawCode);
        cb(null, `${locationCode}.jpg`);
    }
});
const upload = multer({ storage: storage });

// Tạo API Endpoint: Lấy dữ liệu bản đồ
app.get('/api/map-data', async (req, res) => {
    try {
        const mapData = await getMapData();
        // Trả dữ liệu về cho frontend dưới dạng JSON
        res.status(200).json(mapData);
    } catch (error) {
        console.error("Lỗi API /api/map-data:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể kết nối hoặc lấy dữ liệu Database." });
    }
});

app.get('/api/locations/:code', async (req, res) => {
    try {
        const location = await getLocationByCode(req.params.code);
        if (!location) {
            return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });
        }
        res.status(200).json({ location });
    } catch (error) {
        console.error('Lỗi API /api/locations/:code:', error);
        res.status(500).json({ error: 'Lỗi Server: Không thể lấy dữ liệu địa điểm.' });
    }
});

// Tạo API Endpoint: Lấy danh sách tin tức từ bảng tintuc
app.get('/api/news', async (req, res) => {
    try {
        const news = await getNewsData();
        res.status(200).json({ news });
    } catch (error) {
        console.error('Lỗi API /api/news:', error);
        res.status(500).json({ error: 'Lỗi Server: Không thể lấy dữ liệu tin tức.' });
    }
});

// Tạo API Endpoint: Lấy chi tiết tin tức theo id
app.get('/api/news/:id', async (req, res) => {
    try {
        const newsItem = await getNewsById(req.params.id);
        if (!newsItem) {
            return res.status(404).json({ error: 'Không tìm thấy tin tức.' });
        }
        res.status(200).json({ news: newsItem });
    } catch (error) {
        console.error('Lỗi API /api/news/:id:', error);
        res.status(500).json({ error: 'Lỗi Server: Không thể lấy chi tiết tin tức.' });
    }
});

// Tạo API Endpoint: Lấy danh sách tài khoản từ bảng account
app.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await getAccounts();
        res.status(200).json({ accounts });
    } catch (error) {
        console.error('Lỗi API /api/accounts:', error);
        res.status(500).json({ error: 'Lỗi Server: Không thể lấy dữ liệu tài khoản.' });
    }
});

// API Endpoint: Thêm địa điểm mới
app.post('/api/locations', upload.single('image'), async (req, res) => {
    try {
        const { location_code, building } = req.body;
        if (!location_code || !String(location_code).trim()) {
            return res.status(400).json({ error: 'Mã địa điểm không được bỏ trống.' });
        }
        if (!building || !String(building).trim()) {
            return res.status(400).json({ error: 'Vui lòng chọn tòa nhà.' });
        }

        await addLocation(req.body);
        res.status(201).json({ message: "Thêm mới thành công" });
    } catch (error) {
        console.error("Lỗi API POST /api/locations:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể thêm địa điểm." });
    }
});

// API Endpoint: Cập nhật thông tin địa điểm
app.put('/api/locations/:code', upload.single('image'), async (req, res) => {
    try {
        const { building, location_code: newCode } = req.body;
        const oldCode = req.params.code;

        if (!building || !String(building).trim()) {
            return res.status(400).json({ error: 'Vui lòng chọn tòa nhà.' });
        }

        // Nếu đổi mã địa điểm và không upload ảnh mới, ta cần đổi tên file ảnh cũ
        if (newCode && newCode !== oldCode && !req.file) {
            const oldPath = path.join(uploadPath, `${sanitizeFileName(oldCode)}.jpg`);
            const newPath = path.join(uploadPath, `${sanitizeFileName(newCode)}.jpg`);
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
            }
        }

        await updateLocation(req.params.code, req.body);
        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        console.error("Lỗi API PUT /api/locations/:code:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể cập nhật thông tin." });
    }
});

// API Endpoint: Xóa địa điểm
app.delete('/api/locations/:code', async (req, res) => {
    try {
        const locationCode = sanitizeFileName(req.params.code);
        await deleteLocation(locationCode);
        const imageFilePath = path.join(uploadPath, `${locationCode}.jpg`);
        if (fs.existsSync(imageFilePath)) {
            fs.unlinkSync(imageFilePath);
        }
        res.status(200).json({ message: "Xóa thành công" });
    } catch (error) {
        console.error("Lỗi API DELETE /api/locations/:code:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể xóa địa điểm." });
    }
});

// API Endpoint: Cập nhật trạng thái hiển thị tìm kiếm cho địa điểm
app.put('/api/locations/:code/type', async (req, res) => {
    try {
        const { type } = req.body;
        await updateLocationType(req.params.code, type);
        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi Server: Không thể cập nhật trạng thái." });
    }
});

// Chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Backend Server đang chạy tại cổng: ${PORT}`);
    console.log(`📍 Test API tại: http://localhost:${PORT}/api/map-data`);
    console.log(`======================================================\n`);
});