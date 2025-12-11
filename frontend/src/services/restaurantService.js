import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8080/api/admin/restaurants';

// Lấy danh sách quán pending
export const getPendingRestaurants = async (startDate, endDate) => {
    const startParam = startDate ? dayjs(startDate).format('YYYY-MM-DD') : null;
    const endParam = endDate ? dayjs(endDate).format('YYYY-MM-DD') : null;
    const response = await axios.get(`${API_URL}/pending`, {
        params: {
            startDate: startParam,
            endDate: endParam
        }
    });
    return response.data;
};

// Duyệt hoặc từ chối quán
export const approveRestaurant = async (id, isApproved) => {
    // isApproved là true hoặc false
    const response = await axios.put(`${API_URL}/${id}/approve`, null, {
        params: { isApproved }
    });
    return response.data;
};

// MỚI: Lấy danh sách quán (có search)
export const getManagedRestaurants = async (keyword = '', status = 'ALL') => {
    const response = await axios.get(`${API_URL}`, {
        params: {
            keyword,
            status: status === 'ALL' ? null : status // Nếu ALL thì không gửi status để backend tự xử lý
        }
    });
    return response.data;
};

// MỚI: Khóa/Mở khóa
export const toggleRestaurantStatus = async (id) => {
    const response = await axios.put(`${API_URL}/${id}/toggle-status`);
    return response.data;
};

// Lấy menu của nhà hàng
export const getRestaurantMenu = async (restaurantId) => {
    const response = await axios.get(`${API_URL}/${restaurantId}/menu`);
    return response.data;
};