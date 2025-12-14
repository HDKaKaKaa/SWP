import axios from 'axios';

// Đường dẫn gốc tới API DASHBOARD
const DASHBOARD_URL = 'http://localhost:8080/api/admin/dashboard';
// Đường dẫn gốc tới API Accounts
const ACCOUNTS_URL = 'http://localhost:8080/api/admin/accounts';
// Đường dẫn gốc tới API Users
const USERS_URL = 'http://localhost:8080/api/admin/users';

// =================== DASHBOARD ===================
export const getDashboardStats = async () => {
    // Gọi API: /stats
    const response = await axios.get(`${DASHBOARD_URL}/stats`);
    return response.data;
};

export const getRevenueChart = async () => {
    // Gọi API: /chart
    const response = await axios.get(`${DASHBOARD_URL}/chart`);
    return response.data;
};

// =================== ACCOUNTS ===================
export const getAllAccounts = async () => {
    const response = await axios.get(ACCOUNTS_URL);
    return response.data;
};

export const deactivateAccount = async (accountId) => {
    const response = await axios.put(`${ACCOUNTS_URL}/${accountId}/deactivate`);
    return response.data;
};

export const activateAccount = async (accountId) => {
    const response = await axios.put(`${ACCOUNTS_URL}/${accountId}/activate`);
    return response.data;
};

// =================== USERS ===================
export const getAdminCustomers = async () => {
    const res = await axios.get(`${USERS_URL}/customers`);
    return res.data;
};

export const getAdminShippers = async () => {
    const res = await axios.get(`${USERS_URL}/shippers`);
    return res.data;
};

export const getAdminOwners = async () => {
    const res = await axios.get(`${USERS_URL}/owners`);
    return res.data;
};

export const getAdminUserDetail = async (accountId) => {
    const res = await axios.get(`${USERS_URL}/${accountId}/detail`);
    return res.data;
};