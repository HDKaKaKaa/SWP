import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/orders';

/**
 * Lấy danh sách đơn hàng của khách hàng
 */
export const getCustomerOrders = async (customerId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/customer/${customerId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Tạo feedback cho đơn hàng
 */
export const createFeedback = async (orderId, rating, comment, shipperRating, shipperComment) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/${orderId}/feedback`, {
            rating,
            comment,
            shipperRating,
            shipperComment
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateOrderNote = async (orderId, note) => {
    await axios.put(
        `${API_BASE_URL}/${orderId}/note`,
        { note },
        { withCredentials: true}
    );
};

