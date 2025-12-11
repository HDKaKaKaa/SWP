import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/payment';

// Giả lập thanh toán thành công (PayOS simulate)
export const simulatePaymentSuccess = async (orderId) => {
    const response = await axios.post(
        `${API_BASE_URL}/simulate/success/${orderId}`,
        {},
        { withCredentials: true }
    );
    return response.data;
};
