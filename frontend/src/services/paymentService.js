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

// VNPay sandbox: tạo URL để redirect sang cổng thanh toán
export const createVnpayPaymentUrl = async (orderId) => {
    const res = await axios.post(
        `${API_BASE_URL}/vnpay/create-url/${orderId}`,
        {},
        { withCredentials: true }
    );
    return res.data; // { paymentUrl }
};

// VNPay sandbox: FE gửi query params về BE để verify chữ ký + update order
export const confirmVnpayReturn = async (params) => {
    const res = await axios.post(
        `${API_BASE_URL}/vnpay/confirm-return`,
        null,
        { params, withCredentials: true }
    );
    return res.data;
};
