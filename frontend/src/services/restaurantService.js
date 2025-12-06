import axios from 'axios';

const API_URL = 'http://localhost:8080/api/admin/restaurants';

// Lấy danh sách quán pending
export const getPendingRestaurants = async () => {
    const response = await axios.get(`${API_URL}/pending`);
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