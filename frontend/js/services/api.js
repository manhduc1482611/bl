/**
 * FILE: frontend/js/services/api.js
 * CHỨC NĂNG: Lấy dữ liệu bản đồ từ Server Node.js (Cổng 3000) -> Trả về JSON cho thuật toán Dijkstra
 */

/**
 * API Client class for making HTTP requests
 */
class ApiClient {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Not found');
                }
                throw new Error(`HTTP error status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (GET ${endpoint}):`, error);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (POST ${endpoint}):`, error);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (PUT ${endpoint}):`, error);
            throw error;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (DELETE ${endpoint}):`, error);
            throw error;
        }
    }
}

async function fetchMapData() {
    try {
        // Gọi thẳng vào API Node.js đang chạy ở cổng 3000
        const response = await fetch('http://localhost:3000/api/map-data');
        
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        // Nếu Server Node.js trả về lỗi (do sai SQL, mất kết nối DB...)
        if (data.error) {
            console.error("Backend báo lỗi:", data.error);
            return null;
        }

        console.log("✅ Lấy dữ liệu từ Database thành công:", data);
        return data;
        
    } catch (error) {
        console.error("❌ Lỗi kết nối đến máy chủ Backend:", error);
        return null;
    }
}

async function fetchNews() {
    try {
        const response = await fetch('http://localhost:3000/api/news');
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            console.error('Backend báo lỗi:', data.error);
            return null;
        }
        return Array.isArray(data.news) ? data.news : [];
    } catch (error) {
        console.error('❌ Lỗi kết nối đến API tin tức:', error);
        return null;
    }
}

async function fetchNewsById(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/news/${encodeURIComponent(id)}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            console.error('Backend báo lỗi:', data.error);
            return null;
        }
        return data.news || null;
    } catch (error) {
        console.error('❌ Lỗi kết nối đến API tin tức:', error);
        return null;
    }
}

async function fetchAccounts() {
    try {
        const response = await fetch('http://localhost:3000/api/accounts');
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            console.error('Backend báo lỗi:', data.error);
            return null;
        }
        return Array.isArray(data.accounts) ? data.accounts : [];
    } catch (error) {
        console.error('❌ Lỗi kết nối đến API tài khoản:', error);
        return null;
    }
}