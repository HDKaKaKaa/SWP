import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Lấy thông tin nhà hàng (public)
export const getRestaurantById = async (id) => {
    const response = await axios.get(`${API_BASE_URL}/restaurants/${id}`);
    return response.data;
};

// Lấy danh sách món của nhà hàng (public)
export const getProductsByRestaurant = async (restaurantId) => {
    const response = await axios.get(`${API_BASE_URL}/products`, {
        params: { restaurantId },
    });
    return response.data;
};
