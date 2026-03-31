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
                    type
             FROM Locations`
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
            `SELECT location_code, node_id, building, specific_location, floor, description, type
             FROM Locations
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
    try {
        const [rows] = await pool.query(
            `SELECT id
             FROM Nodes
             WHERE LOWER(name) = LOWER(?)`,
            [building.trim()]
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
    const { location_code, building, specific_location, floor, description, type, node_id: manual_node_id } = data;
    const node_id = (manual_node_id && manual_node_id !== 'null' && manual_node_id !== '') ? manual_node_id : await resolveNodeId(building);

    try {
        await pool.query(
            `INSERT INTO Locations (location_code, node_id, building, specific_location, floor, description, type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [location_code, node_id || null, building || null, specific_location || null, floor || null, description || null, type || 1]
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
    const { location_code: newLocationCode, building, specific_location, floor, description, node_id: manual_node_id } = data;
    const node_id = (manual_node_id && manual_node_id !== 'null' && manual_node_id !== '') ? manual_node_id : await resolveNodeId(building);

    try {
        await pool.query(
            `UPDATE Locations 
             SET location_code = ?, node_id = ?, building = ?, specific_location = ?, floor = ?, description = ? 
             WHERE location_code = ?`,
            [newLocationCode || locationCode, node_id || null, building || null, specific_location || null, floor || null, description || null, locationCode]
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

module.exports = { 
    getMapData, 
    getLocationByCode,
    getNewsData, 
    getNewsById, 
    getAccounts, 
    updateLocationType, 
    addLocation, 
    updateLocation,
    deleteLocation
};