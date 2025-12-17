import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/shipper';

// Lấy danh sách đơn hàng có sẵn
export const getAvailableOrders = async () => {
    const response = await axios.get(`${API_BASE_URL}/orders/available`);
    return response.data;
};

// Lấy danh sách đơn hàng của shipper
export const getMyOrders = async (shipperId) => {
    const response = await axios.get(`${API_BASE_URL}/orders/my-orders`, {
        params: { shipperId }
    });
    return response.data;
};

// Nhận đơn hàng
export const acceptOrder = async (orderId, shipperId) => {
    const response = await axios.post(
        `${API_BASE_URL}/orders/${orderId}/accept`,
        null,
        { params: { shipperId } }
    );
    return response.data;
};

// Bắt đầu giao hàng
export const startDelivery = async (orderId, shipperId) => {
    const response = await axios.post(
        `${API_BASE_URL}/orders/${orderId}/start-delivery`,
        null,
        { params: { shipperId } }
    );
    return response.data;
};

// Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (orderId, status) => {
    const response = await axios.put(
        `${API_BASE_URL}/orders/${orderId}/status`,
        null,
        { params: { status } }
    );
    return response.data;
};

// Lấy thông tin shipper
export const getShipperProfile = async (shipperId) => {
    const response = await axios.get(`${API_BASE_URL}/profile`, {
        params: { shipperId }
    });
    return response.data;
};

// Cập nhật thông tin shipper
export const updateShipperProfile = async (shipperId, updates) => {
    const response = await axios.put(
        `${API_BASE_URL}/profile`,
        updates,
        { params: { shipperId } }
    );
    return response.data;
};

// Upload ảnh đại diện
export const uploadAvatar = async (shipperId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(
        `${API_BASE_URL}/profile/avatar`,
        formData,
        { 
            params: { shipperId },
            headers: { 'Content-Type': 'multipart/form-data' }
        }
    );
    return response.data;
};

// Đổi mật khẩu
export const changePassword = async (accountId, oldPassword, newPassword, confirmPassword) => {
    const response = await axios.put(
        `${API_BASE_URL}/change-password`,
        { accountId, oldPassword, newPassword, confirmPassword }
    );
    return response.data;
};

// Cập nhật trạng thái shipper
export const updateShipperStatus = async (shipperId, status) => {
    const response = await axios.put(
        `${API_BASE_URL}/status`,
        null,
        { params: { shipperId, status } }
    );
    return response.data;
};

// Sửa đơn hàng
export const editOrder = async (orderId, shipperId, updates) => {
    const response = await axios.put(
        `${API_BASE_URL}/orders/${orderId}/edit`,
        updates,
        { params: { shipperId } }
    );
    return response.data;
};

// Xóa đơn hàng
export const deleteOrder = async (orderId, shipperId) => {
    const response = await axios.delete(
        `${API_BASE_URL}/orders/${orderId}`,
        { params: { shipperId } }
    );
    return response.data;
};

// Lấy chi tiết đơn hàng
export const getOrderDetail = async (orderId, shipperId) => {
    const response = await axios.get(
        `${API_BASE_URL}/orders/${orderId}/detail`,
        { params: { shipperId } }
    );
    return response.data;
};


