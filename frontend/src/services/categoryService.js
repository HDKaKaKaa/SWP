import axios from 'axios';

// URL gốc của API Category
const API_URL = 'http://localhost:8080/api/admin/categories';

// 1. Lấy danh sách
export const getAllCategories = async (keyword = '') => {
    // Truyền param keyword lên server
    const response = await axios.get(API_URL, { params: { keyword } });
    return response.data;
};

// 2. Tạo mới
export const createCategory = async (categoryData) => {
    const response = await axios.post(API_URL, categoryData);
    return response.data;
};

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('http://localhost:8080/api/upload/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data; // Trả về URL ảnh (http://localhost:8080/images/...)
};

// 3. Cập nhật
export const updateCategory = async (id, categoryData) => {
    const response = await axios.put(`${API_URL}/${id}`, categoryData);
    return response.data;
};

// 4. Xóa
export const deleteCategory = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};