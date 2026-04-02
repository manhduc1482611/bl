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
        const { tieuDe, ngay, anhDaiDien, moTaNgan, blocks } = data;
        const [result] = await pool.query(
            `INSERT INTO tintuc (tieuDe, ngay, anhDaiDien, moTaNgan, blocks) VALUES (?, ?, ?, ?, ?)`,
            [tieuDe, ngay, anhDaiDien, moTaNgan, JSON.stringify(blocks || [])]
        );
        return result.insertId;
    } catch (error) {
        console.error("Lỗi khi thêm tin tức vào MySQL: ", error);
        throw error;
    }
}

async function updateNews(id, data) {
    try {
        const { tieuDe, ngay, anhDaiDien, moTaNgan, blocks } = data;
        await pool.query(
            `UPDATE tintuc SET tieuDe = ?, ngay = ?, anhDaiDien = ?, moTaNgan = ?, blocks = ? WHERE id = ?`,
            [tieuDe, ngay, anhDaiDien, moTaNgan, JSON.stringify(blocks || []), id]
        );
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

        if (Anh !== undefined && Anh !== null) {
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
    deleteNews
};