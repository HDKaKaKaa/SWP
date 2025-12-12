import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Đổi mật khẩu
export const changePassword = async (formData) => {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
        throw { response: { data: 'Bạn chưa đăng nhập (Không tìm thấy thông tin user)!' } };
    }

    const user = JSON.parse(userStr);
    const accountId = user.id || user.accountId;

    if (!accountId) {
        throw { response: { data: 'Lỗi dữ liệu đăng nhập: Không tìm thấy ID tài khoản.' } };
    }

    const requestBody = {
        accountId: accountId,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
    };

    const response = await axios.put(
        `${API_BASE_URL}/customers/change-password`,
        requestBody
    );

    return response.data;
};

// Lấy thông tin profile
export const getCustomerProfile = async (accountId) => {
    const response = await axios.get(
        `${API_BASE_URL}/customer/profile/${accountId}`
    );
    return response.data;
};

// Cập nhật thông tin profile
export const updateCustomerProfile = async (accountId, payload) => {
    const response = await axios.put(
        `${API_BASE_URL}/customer/profile/${accountId}`,
        payload
    );
    return response.data;
};
