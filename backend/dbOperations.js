const pool = require('./dbConfig');

async function getMapData() {
    try {
        // Thực hiện 4 câu lệnh Query để lấy toàn bộ dữ liệu từ 4 bảng
        const [nodes] = await pool.query(
            `SELECT id, name, pos_x, pos_y, node_type
             FROM Nodes`
        );
        const [edges] = await pool.query(
            `SELECT from_node_id AS from_node,
                    to_node_id AS to_node,
                    type
             FROM Edges`
        );
        const [locations] = await pool.query(
            `SELECT location_code,
                    location_code AS id,
                    node_id,
                    building,
                    specific_location,
                    floor,
                    description,
                    type,
                    image
             FROM view_locations_sorted
             ORDER BY 
                CAST(SUBSTRING_INDEX(location_code, '_', 1) AS UNSIGNED) ASC,
                CAST(SUBSTRING_INDEX(location_code, '_', -1) AS UNSIGNED) ASC`
        );

        const [turnRules] = await pool.query(
            `SELECT id,
                    from_node,
                    via_node,
                    to_node,
                    turn_direction
             FROM TurnRules`
        );

        // Gom lại thành 1 Object JSON và trả về
        return {
            nodes,
            edges,
            locations,
            turnRules
        };
    } catch (error) {
        console.error("Lỗi khi truy vấn Database: ", error);
        throw error; // Ném lỗi ra để file server.js bắt và báo lỗi
    }
}

async function getLocationByCode(locationCode) {
    try {
        const [rows] = await pool.query(
            `SELECT location_code, node_id, building, specific_location, floor, description, type, image
             FROM view_locations_sorted
             WHERE location_code = ?
             LIMIT 1`,
            [locationCode]
        );
        return rows && rows.length ? rows[0] : null;
    } catch (error) {
        console.error("Lỗi khi truy vấn Location theo code: ", error);
        throw error;
    }
}

async function getNewsData() {
    try {
        const [news] = await pool.query(
            `SELECT * FROM tintuc ORDER BY id DESC`
        );
        return news;
    } catch (error) {
        console.error("Lỗi khi truy vấn bảng tintuc: ", error);
        throw error;
    }
}

async function getNewsById(id) {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM tintuc WHERE id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Lỗi khi truy vấn chi tiết tin tức: ", error);
        throw error;
    }
}

async function getAccounts() {
    try {
        const [accounts] = await pool.query(
            `SELECT * FROM accounts`
        );
        return accounts;
    } catch (error) {
        console.error("Lỗi khi truy vấn bảng accounts: ", error);
        throw error;
    }
}

// Tự động xác định node_id từ bảng Nodes bằng cách đối chiếu tên tòa nhà (building) với trường name của Nodes.
// Nếu có nhiều node trùng tên, ưu tiên id kết thúc bằng '.1'.
async function resolveNodeId(building) {
    if (!building || !String(building).trim()) return null;
    
    // Làm sạch tên tòa nhà trước khi truy vấn
    const cleanBuilding = building.trim();

    try {
        const [rows] = await pool.query(
            `SELECT id
             FROM Nodes
             WHERE LOWER(name) = LOWER(?) OR LOWER(id) = LOWER(?)`,
            [cleanBuilding, cleanBuilding]
        );

        if (!rows || rows.length === 0) {
            return null;
        }

        const preferred = rows.find(row => String(row.id).endsWith('.1'));
        return preferred ? preferred.id : rows[0].id;
    } catch (error) {
        console.error("Lỗi khi tìm node_id theo building:", error);
        return null;
    }
}

async function updateLocationType(locationCode, type) {
    try {
        await pool.query(
            `UPDATE Locations SET type = ? WHERE location_code = ?`,
            [type, locationCode]
        );
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật type cho Location: ", error);
        throw error;
    }
}

/**
 * Thêm một địa điểm mới vào bảng Locations
 */
async function addLocation(data) {
    // Đảm bảo không có giá trị nào là undefined khi đưa vào câu lệnh SQL
    const location_code = data.location_code ? String(data.location_code).trim() : null;
    const building = data.building || null;
    const specific_location = data.specific_location || null;
    const floor = data.floor || null;
    const description = data.description || null;
    const type = data.type !== undefined ? data.type : 1;
    const image = data.image || null;
    const manual_node_id = data.node_id;
    
    // Kiểm tra an toàn cho node_id
    const isValidManualId = manual_node_id && manual_node_id !== 'null' && manual_node_id !== 'undefined' && String(manual_node_id).trim() !== '';
    const node_id = isValidManualId ? manual_node_id : await resolveNodeId(building);

    try {
        await pool.query(
            `INSERT INTO Locations (location_code, node_id, building, specific_location, floor, description, type, image) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [location_code, node_id, building, specific_location, floor, description, type, image]
        );
        return true;
    } catch (error) {
        console.error("Lỗi khi thêm Location vào MySQL: ", error);
        throw error;
    }
}

/**
 * Cập nhật thông tin địa điểm đã tồn tại
 */
async function updateLocation(locationCode, data) {
    const newLocationCode = data.location_code || locationCode;
    const building = data.building || null;
    const specific_location = data.specific_location || null;
    const floor = data.floor || null;
    const description = data.description || null;
    const type = data.type !== undefined ? data.type : null;
    const image = data.image || null;
    const manual_node_id = data.node_id;

    // Đảm bảo node_id là null nếu không có giá trị hợp lệ
    const isValidManualId = manual_node_id && manual_node_id !== 'null' && manual_node_id !== 'undefined' && String(manual_node_id).trim() !== '';
    const node_id = isValidManualId ? manual_node_id : await resolveNodeId(building);

    try {
        // Cập nhật đầy đủ các trường bao gồm cả type nếu có
        let sql = `UPDATE Locations 
                   SET location_code = ?, node_id = ?, building = ?, specific_location = ?, floor = ?, description = ?, image = ?`;
        let params = [newLocationCode, node_id, building, specific_location, floor, description, image];

        if (type !== null) {
            sql += `, type = ?`;
            params.push(type);
        }

        sql += ` WHERE location_code = ?`;
        params.push(locationCode);

        await pool.query(
            sql,
            params
        );
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật Location trong MySQL: ", error);
        throw error;
    }
}

/**
 * Xóa một địa điểm khỏi bảng Locations
 */
async function deleteLocation(locationCode) {
    try {
        await pool.query(
            `DELETE FROM Locations WHERE location_code = ?`,
            [locationCode]
        );
        return true;
    } catch (error) {
        console.error("Lỗi khi xóa Location trong MySQL: ", error);
        throw error;
    }
}

async function addNews(data) {
    try {
        // Extract basic fields
        const { tieuDe, ngay, anhDaiDien, noiDung } = data;
        
        // Build dynamic SET clause
        let setClause = 'tieuDe = ?, ngay = ?, anhDaiDien = ?, noiDung = ?';
        let values = [tieuDe, ngay, anhDaiDien, noiDung || null];
        
        // Add ct and img fields
        for (let i = 1; i <= 20; i++) {
            const ctKey = `ct${i}`;
            const imgKey = `img${i}`;
            
            setClause += `, ${ctKey} = ?, ${imgKey} = ?`;
            values.push(data[ctKey] || null, data[imgKey] || null);
        }
        
        const query = `INSERT INTO tintuc SET ${setClause}`;
        const [result] = await pool.query(query, values);
        return result.insertId;
    } catch (error) {
        console.error("Lỗi khi thêm tin tức vào MySQL: ", error);
        throw error;
    }
}

async function updateNews(id, data) {
    try {
        // Extract basic fields
        const { tieuDe, ngay, anhDaiDien, noiDung } = data;
        
        // Build dynamic SET clause
        let setClause = 'tieuDe = ?, ngay = ?, anhDaiDien = ?, noiDung = ?';
        let values = [tieuDe, ngay, anhDaiDien, noiDung || null];
        
        // Add ct and img fields
        for (let i = 1; i <= 20; i++) {
            const ctKey = `ct${i}`;
            const imgKey = `img${i}`;
            
            setClause += `, ${ctKey} = ?, ${imgKey} = ?`;
            values.push(data[ctKey] || null, data[imgKey] || null);
        }
        
        values.push(id); // Add id for WHERE clause
        
        const query = `UPDATE tintuc SET ${setClause} WHERE id = ?`;
        await pool.query(query, values);
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật tin tức trong MySQL: ", error);
        throw error;
    }
}

async function deleteNews(id) {
    try {
        await pool.query(`DELETE FROM tintuc WHERE id = ?`, [id]);
        return true;
    } catch (error) {
        console.error("Lỗi khi xóa tin tức trong MySQL: ", error);
        throw error;
    }
}

async function getActivityData() {
    try {
        const [activities] = await pool.query(
            `SELECT 
                h.*,
                COALESCE(n.name, '') AS tenToa
             FROM hoatdong h
             LEFT JOIN Nodes n ON h.Toa = n.id
             ORDER BY h.MHD DESC`
        );
        return activities;
    } catch (error) {
        console.error("Lỗi khi truy vấn bảng hoatdong: ", error);
        throw error;
    }
}

async function getActivityById(id) {
    try {
        const [rows] = await pool.query(
            `SELECT 
                h.*,
                COALESCE(n.name, '') AS tenToa
             FROM hoatdong h
             LEFT JOIN Nodes n ON h.Toa = n.id
             WHERE h.MHD = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Lỗi khi truy vấn chi tiết hoạt động: ", error);
        throw error;
    }
}

async function addActivity(data) {
    try {
        const { MHD, THD, Time, Phong, Toa, MoTa, Anh } = data;
        const [result] = await pool.query(
            `INSERT INTO hoatdong (MHD, THD, Time, Phong, Toa, MoTa, Anh) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [MHD, THD, Time, Phong, Toa, MoTa, Anh]
        );
        return result.insertId;
    } catch (error) {
        console.error("Lỗi khi thêm hoạt động vào MySQL: ", error);
        throw error;
    }
}

async function updateActivity(id, data) {
    try {
        const { THD, Time, Phong, Toa, MoTa, Anh } = data;
        let sql = `UPDATE hoatdong SET THD = ?, Time = ?, Phong = ?, Toa = ?, MoTa = ?`;
        let params = [THD, Time, Phong, Toa, MoTa];

        // Chỉ cần khác undefined là thực hiện cập nhật (để chấp nhận giá trị null)
        if (Anh !== undefined) {
            sql += `, Anh = ?`;
            params.push(Anh);
        }

        sql += ` WHERE MHD = ?`;
        params.push(id);

        await pool.query(sql, params);
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật hoạt động trong MySQL: ", error);
        throw error;
    }
}

async function deleteActivity(id) {
    try {
        await pool.query(`DELETE FROM hoatdong WHERE MHD = ?`, [id]);
        return true;
    } catch (error) {
        console.error("Lỗi khi xóa hoạt động trong MySQL: ", error);
        throw error;
    }
}

/**
 * Hoán đổi dữ liệu giữa hai mã địa điểm
 */
async function swapLocations(code1, code2) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Lấy dữ liệu hiện tại của 2 địa điểm
        const [rows] = await connection.query(
            'SELECT * FROM Locations WHERE location_code IN (?, ?)',
            [code1, code2]
        );

        if (rows.length < 2) throw new Error('Không tìm thấy đủ 2 địa điểm để hoán đổi');

        const loc1 = rows.find(r => r.location_code === code1);
        const loc2 = rows.find(r => r.location_code === code2);

        // 2. Các trường cần hoán đổi (ngoại trừ location_code)
        const fields = ['node_id', 'building', 'specific_location', 'floor', 'description', 'type', 'image'];
        
        const buildUpdate = (targetCode, sourceData) => {
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => sourceData[f]).concat([targetCode]);
            return { sql: `UPDATE Locations SET ${setClause} WHERE location_code = ?`, values };
        };

        const u1 = buildUpdate(code1, loc2);
        const u2 = buildUpdate(code2, loc1);

        await connection.query(u1.sql, u1.values);
        await connection.query(u2.sql, u2.values);

        // 3. Cập nhật lại cột 'image' trong DB để khớp với mã mới (giữ nguyên extension)
        const fixImg = async (code, oldImg) => {
            if (!oldImg) return null;
            const ext = oldImg.includes('.') ? oldImg.split('.').pop() : 'jpg';
            const newName = `${code}.${ext}`;
            await connection.query('UPDATE Locations SET image = ? WHERE location_code = ?', [newName, code]);
            return newName;
        };

        const finalImg1 = await fixImg(code1, loc2.image);
        const finalImg2 = await fixImg(code2, loc1.image);

        await connection.commit();
        return { loc1, loc2, finalImg1, finalImg2 };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { 
    getMapData, 
    getLocationByCode,
    getNewsData, 
    getNewsById, 
    getAccounts,
    getActivityData,
    getActivityById,
    addActivity,
    updateActivity,
    deleteActivity, 
    updateLocationType, 
    addLocation, 
    updateLocation,
    deleteLocation,
    addNews,
    updateNews,
    deleteNews,
    swapLocations
};