import axios from 'axios';

// Đường dẫn gốc tới API Spring Boot
const API_URL = 'http://localhost:8080/api/admin/dashboard';

export const getDashboardStats = async () => {
    // Gọi API: /stats
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
};

export const getRevenueChart = async () => {
    // Gọi API: /chart
    const response = await axios.get(`${API_URL}/chart`);
    return response.data;
};