const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getMapData, getLocationByCode, getNewsData, getNewsById, getAccounts, getActivityData, getActivityById, addActivity, updateActivity, deleteActivity, updateLocationType, addLocation, updateLocation, deleteLocation, addNews, updateNews, deleteNews } = require('./dbOperations');
require('dotenv').config();

const app = express();

// Middleware quan trọng
app.use(cors()); // Cho phép Frontend (VD: Live Server) gọi API không bị chặn lỗi CORS
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log('REQUEST:', req.method, req.path);
    next();
}); 

const uploadPath = path.join(__dirname, '../frontend/assets/images/pages/ban-do/tim-duong');
const newsUploadPath = path.join(__dirname, '../frontend/assets/images/pages/tin-tuc');
const activityUploadPath = path.join(__dirname, '../frontend/assets/images/pages/hoat-dong');

// Cho phép truy cập thư mục ảnh tòa nhà công khai qua URL
app.use('/api/location-images', express.static(uploadPath));
// Cho phép truy cập thư mục ảnh tin tức công khai qua URL
app.use('/api/news-images', express.static(newsUploadPath));
// Cho phép truy cập thư mục ảnh hoạt động công khai qua URL
app.use('/api/activity-images', express.static(activityUploadPath));

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
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${locationCode}${ext}`);
    }
});
const upload = multer({ storage: storage });

const newsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(newsUploadPath)) fs.mkdirSync(newsUploadPath, { recursive: true });
        cb(null, newsUploadPath);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `news-${timestamp}${ext}`);
    }
});
const uploadNews = multer({ storage: newsStorage });

const activityStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(activityUploadPath)) fs.mkdirSync(activityUploadPath, { recursive: true });
        cb(null, activityUploadPath);
    },
    filename: function (req, file, cb) {
        // Lấy MHD từ body (ưu tiên) hoặc params để đặt tên file
        const rawId = req.body.MHD || req.params.id || Date.now().toString();
        const mhd = sanitizeFileName(rawId);
        // Ép tên file luôn là {MHD}.jpg để khớp với logic lưu cột Anh
        cb(null, `${mhd}.jpg`);
    }
});
const uploadActivity = multer({ storage: activityStorage });

const contentImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(newsUploadPath)) fs.mkdirSync(newsUploadPath, { recursive: true });
        cb(null, newsUploadPath);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `content-${timestamp}-${random}${ext}`);
    }
});
const uploadContentImage = multer({ storage: contentImageStorage });

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
        const code = req.params.code;
        const location = await getLocationByCode(code);
        if (!location) {
            return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });
        }
        
        // Sử dụng tên file từ cột image trong database
        const imageUrl = location.image ? `/api/location-images/${location.image}` : null;
        res.status(200).json({ location: { ...location, imageUrl } });
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

// Tạo API Endpoint: Lấy danh sách hoạt động từ bảng hoatdong
app.get('/api/activities', async (req, res) => {
    console.log('🎯 GET /api/activities - ROUTE TRIGGERED');
    try {
        console.log('⏳ Fetching activity data...');
        const activities = await getActivityData();
        console.log('✅ Activity data fetched, count:', activities.length);
        res.status(200).json({ activities });
    } catch (error) {
        console.error('❌ Lỗi API /api/activities:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Lỗi Server: Không thể lấy dữ liệu hoạt động.', details: error.message });
    }
});

// Tạo API Endpoint: Lấy chi tiết hoạt động theo id
app.get('/api/activities/:id', async (req, res) => {
    try {
        const activity = await getActivityById(req.params.id);
        if (!activity) {
            return res.status(404).json({ error: 'Không tìm thấy hoạt động.' });
        }
        res.status(200).json({ activity });
    } catch (error) {
        console.error('Lỗi API /api/activities/:id:', error);
        res.status(500).json({ error: 'Lỗi Server: Không thể lấy chi tiết hoạt động.' });
    }
});

// API Endpoint: Thêm tin tức mới
app.post('/api/news', uploadNews.any(), async (req, res) => {
    try {
        const newsData = { ...req.body };
        
        // Xử lý các file được upload (anhDaiDien và các img1, img2...)
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                // Chỉ lưu tên file vào database để frontend tự nối path
                if (file.fieldname === 'anhDaiDien') {
                    newsData.anhDaiDien = file.filename;
                } else if (file.fieldname.startsWith('img')) {
                    newsData[file.fieldname] = file.filename;
                }
            });
        }
        
        const id = await addNews(newsData);
        res.status(201).json({ message: "Thêm tin tức thành công", id });
    } catch (error) {
        console.error("Lỗi API POST /api/news:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể thêm tin tức." });
    }
});

// API Endpoint: Cập nhật tin tức
app.put('/api/news/:id', uploadNews.any(), async (req, res) => {
    try {
        const id = req.params.id;
        const newsData = { ...req.body };
        
        // Xử lý các file được upload (anhDaiDien và các img1, img2...)
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                if (file.fieldname === 'anhDaiDien') {
                    newsData.anhDaiDien = file.filename;
                } else if (file.fieldname.startsWith('img')) {
                    newsData[file.fieldname] = file.filename;
                }
            });
        }
        
        await updateNews(id, newsData);
        res.status(200).json({ message: "Cập nhật tin tức thành công" });
    } catch (error) {
        console.error("Lỗi API PUT /api/news/:id:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể cập nhật tin tức." });
    }
});

// API Endpoint: Xóa tin tức
app.delete('/api/news/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await deleteNews(id);
        res.status(200).json({ message: "Xóa tin tức thành công" });
    } catch (error) {
        console.error("Lỗi API DELETE /api/news/:id:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể xóa tin tức." });
    }
});

// API Endpoint: Upload ảnh cho nội dung tin tức
app.post('/api/upload-news-image', uploadNews.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file ảnh được upload' });
        }

        // Trả về URL của ảnh đã upload
        const imageUrl = `/api/news-images/${req.file.filename}`;
        res.status(200).json({ 
            message: 'Upload ảnh thành công',
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Lỗi upload ảnh nội dung:', error);
        res.status(500).json({ error: 'Lỗi server khi upload ảnh' });
    }
});

// API Endpoint: Upload ảnh cho nội dung chi tiết tin tức
app.post('/api/upload/content-image', uploadContentImage.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file ảnh được upload' });
        }

        res.status(200).json({ 
            message: 'Upload ảnh nội dung thành công',
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Lỗi upload ảnh nội dung chi tiết:', error);
        res.status(500).json({ error: 'Lỗi server khi upload ảnh nội dung' });
    }
});

// API Endpoint: Thêm hoạt động mới
app.post('/api/activities', uploadActivity.single('Anh'), async (req, res) => {
    try {
        console.log('POST /api/activities - req.body:', req.body);
        console.log('POST /api/activities - req.file:', req.file);
        
        const activityData = {
            MHD: req.body.MHD,
            THD: req.body.THD,
            Time: req.body.Time,
            Phong: req.body.Phong,
            Toa: req.body.Toa,
            MoTa: req.body.MoTa,
            Anh: req.file ? req.file.filename : null
        };
        console.log('Activity data to insert:', activityData);
        
        const id = await addActivity(activityData);
        res.status(201).json({ message: "Thêm hoạt động thành công", id });
    } catch (error) {
        console.error("Lỗi API POST /api/activities:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể thêm hoạt động." });
    }
});

// API Endpoint: Cập nhật hoạt động
app.put('/api/activities/:id', uploadActivity.single('Anh'), async (req, res) => {
    try {
        const id = req.params.id;
        console.log('PUT /api/activities/:id - ID:', id);
        console.log('PUT /api/activities/:id - req.body:', req.body);
        console.log('PUT /api/activities/:id - req.file:', req.file);
        
        const activity = await getActivityById(id);
        if (!activity) {
            // Nếu có file vừa upload mà không tìm thấy record, xóa file để tránh rác
            if (req.file) {
                const uploadedPath = path.join(activityUploadPath, req.file.filename);
                if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
            }
            return res.status(404).json({ error: 'Không tìm thấy hoạt động.' });
        }

        let filenameToSave = activity.Anh;

        // Xử lý xóa ảnh cũ hoặc cập nhật ảnh mới
        if (req.body.removeImage === 'true') {
            // Trường hợp 1: Người dùng chủ động nhấn nút "Xóa ảnh"
            if (activity.Anh) {
                const oldPath = path.join(activityUploadPath, activity.Anh);
                try {
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    console.log(`🗑️ Đã xóa file ảnh vật lý: ${activity.Anh}`);
                } catch (err) {
                    console.error("Lỗi khi xóa ảnh vật lý:", err);
                }
            }
            filenameToSave = null;
        } else if (req.file) {
            // Trường hợp 2: Người dùng upload ảnh mới. 
            // Nếu tên file cũ khác tên mới, xóa file cũ để tránh rác (Multer tự ghi đè nếu trùng tên)
            if (activity.Anh && activity.Anh !== req.file.filename) {
                const oldPath = path.join(activityUploadPath, activity.Anh);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            filenameToSave = req.file.filename;
        }

        const activityData = {
            MHD: req.body.MHD,
            THD: req.body.THD,
            Time: req.body.Time,
            Phong: req.body.Phong,
            Toa: req.body.Toa,
            MoTa: req.body.MoTa,
            Anh: filenameToSave
        };
        console.log('Activity data to update:', activityData);
        
        await updateActivity(id, activityData);
        res.status(200).json({ message: "Cập nhật hoạt động thành công" });
    } catch (error) {
        console.error("Lỗi API PUT /api/activities/:id:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể cập nhật hoạt động." });
    }
});

// API Endpoint: Xóa hoạt động
app.delete('/api/activities/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // 1. Lấy thông tin hoạt động trước khi xóa để lấy tên file ảnh
        const activity = await getActivityById(id);
        
        // 2. Xóa trong Database
        await deleteActivity(id);

        // 3. Xóa file vật lý nếu có
        if (activity && activity.Anh) {
            const imagePath = path.join(activityUploadPath, activity.Anh);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        res.status(200).json({ message: "Xóa hoạt động thành công" });
    } catch (error) {
        console.error("Lỗi API DELETE /api/activities/:id:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể xóa hoạt động." });
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

        // Kiểm tra xem mã địa điểm đã tồn tại chưa
        const existing = await getLocationByCode(location_code);
        if (existing) {
            return res.status(400).json({ error: 'Mã địa điểm này đã tồn tại trên hệ thống.' });
        }

        const locationData = {
            ...req.body,
            image: req.file ? req.file.filename : null
        };
        await addLocation(locationData);
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

        const location = await getLocationByCode(oldCode);
        if (!location) return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });

        // Nếu đổi mã mới, kiểm tra xem mã mới có bị trùng với địa điểm khác không
        if (newCode && newCode !== oldCode) {
            const existing = await getLocationByCode(newCode);
            if (existing) return res.status(400).json({ error: 'Mã địa điểm mới đã tồn tại.' });
        }

        let imageToSave = location.image;

        // Logic xử lý ảnh khi sửa
        if (req.file) {
            // Nếu upload ảnh mới: Xóa ảnh cũ (nếu có)
            if (location.image && location.image !== req.file.filename) {
                const oldImagePath = path.join(uploadPath, location.image);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
            imageToSave = req.file.filename;
        } else if (newCode && newCode !== oldCode && location.image) {
            // Nếu đổi mã code nhưng không upload ảnh mới: Đổi tên file ảnh cũ theo mã code mới
                const ext = path.extname(location.image);
                const newImageName = `${sanitizeFileName(newCode)}${ext}`;
                const oldPath = path.join(uploadPath, location.image);
                const newPath = path.join(uploadPath, newImageName);

            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
                imageToSave = newImageName;
            }
        }

        const locationData = { ...req.body, image: imageToSave };
        await updateLocation(oldCode, locationData);
        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        console.error("Lỗi API PUT /api/locations/:code:", error);
        res.status(500).json({ error: "Lỗi Server: Không thể cập nhật thông tin." });
    }
});

// API Endpoint: Xóa địa điểm
app.delete('/api/locations/:code', async (req, res) => {
    try {
        const code = req.params.code;
        const location = await getLocationByCode(code);
        await deleteLocation(code);

        if (location && location.image) {
            const imageFilePath = path.join(uploadPath, location.image);
            if (fs.existsSync(imageFilePath)) {
                fs.unlinkSync(imageFilePath);
            }
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