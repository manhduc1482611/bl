document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    if (!form || !errorEl) return;

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        errorEl.textContent = '';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            errorEl.textContent = 'Vui lòng nhập tài khoản và mật khẩu.';
            return;
        }

        let data = await fetchAccounts();
        if (!data) {
            errorEl.textContent = 'Không thể kết nối đến hệ thống tài khoản.';
            return;
        }

        // Đảm bảo lấy đúng mảng accounts cho dù API trả về { accounts: [] } hay []
        const accounts = Array.isArray(data) ? data : (data.accounts || []);

        const findField = (record, candidates) => candidates.find((key) => Object.prototype.hasOwnProperty.call(record, key));
        const usernameKeys = ['username', 'user', 'taikhoan', 'email', 'account', 'account_name', 'ten'];
        const passwordKeys = ['password', 'pass', 'matkhau', 'pwd', 'password_hash'];
        const displayKeys = ['name', 'fullname', 'ho_ten', 'display_name', 'ten'];

        const matched = accounts.find((account) => {
            const usernameKey = findField(account, usernameKeys);
            const passwordKey = findField(account, passwordKeys);
            if (!usernameKey || !passwordKey) return false;
            return String(account[usernameKey]).trim() === username && String(account[passwordKey]).trim() === password;
        });

        if (!matched) {
            errorEl.textContent = 'Tài khoản hoặc mật khẩu không đúng.';
            return;
        }

        const roleKey = findField(matched, ['acc_type', 'type', 'role']) || 'acc_type';
        const accountType = String(matched[roleKey] || '').trim();
        if (accountType !== 'admin_web') {
            errorEl.textContent = 'Chỉ tài khoản admin_web mới được phép truy cập trang quản trị.';
            return;
        }

        const usernameKey = findField(matched, usernameKeys) || 'username';
        const displayKey = findField(matched, displayKeys) || usernameKey;
        const currentUser = {
            username: String(matched[usernameKey]).trim(),
            displayName: String(matched[displayKey] || matched[usernameKey]).trim(),
            acc_type: accountType
        };

        localStorage.setItem('hvnh_current_user', JSON.stringify(currentUser));
        window.location.href = 'admin/admin_map.html';
    });
});
