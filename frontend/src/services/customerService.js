import axios from 'axios';

export const changePassword = async (formData) => {
    // 1. Lấy thông tin user từ localStorage (nơi bạn lưu khi login)
    // Giả sử bạn lưu dạng: localStorage.setItem('user', JSON.stringify(userData));
    const userStr = localStorage.getItem('user');

    if (!userStr) {
        throw { response: { data: 'Bạn chưa đăng nhập (Không tìm thấy thông tin user)!' } };
    }

    const user = JSON.parse(userStr);
    const accountId = user.id || user.accountId; // Kiểm tra xem bạn lưu field nào là ID

    if (!accountId) {
        throw { response: { data: 'Lỗi dữ liệu đăng nhập: Không tìm thấy ID tài khoản.' } };
    }

    // 2. Tạo object dữ liệu gửi đi (kèm accountId)
    const requestBody = {
        accountId: accountId,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
    };

    // 3. Gọi API (Không cần Header Authorization phức tạp nữa, vì logic check ID nằm ở body)
    const response = await axios.put(`http://localhost:8080/api/customers/change-password`, requestBody);

    return response.data;
};