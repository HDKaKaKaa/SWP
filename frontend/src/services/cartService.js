import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Lấy giỏ hàng cho 1 tài khoản + 1 nhà hàng
export const getCart = async (accountId, restaurantId, extraConfig = {}) => {
    const response = await axios.get(`${API_BASE_URL}/cart`, {
        params: { accountId, restaurantId },
        ...extraConfig,
    });
    return response.data;
};

// Thêm 1 item vào giỏ
export const addCartItem = async ({
                                      accountId,
                                      restaurantId,
                                      productId,
                                      quantity,
                                      detailIds,
                                  }) => {
    const response = await axios.post(`${API_BASE_URL}/cart/items`, {
        accountId,
        restaurantId,
        productId,
        quantity,
        detailIds: detailIds || [],
    });
    return response.data;
};

// Cập nhật số lượng theo productId (RestaurantDetail dùng)
export const updateCartItemByProduct = async ({
                                                  accountId,
                                                  productId,
                                                  quantity,
                                                  restaurantId,
                                              }) => {
    const response = await axios.put(`${API_BASE_URL}/cart/items`, {
        accountId,
        productId,
        quantity,
        restaurantId,
    });
    return response.data;
};

// Cập nhật số lượng theo itemId (OrderItem.id) – CartPage & DecreaseComboModal dùng
export const updateCartItemByItemId = async ({
                                                 accountId,
                                                 itemId,
                                                 quantity,
                                                 restaurantId,
                                             }) => {
    const response = await axios.put(`${API_BASE_URL}/cart/items/quantity`, {
        accountId,
        itemId,
        quantity,
        restaurantId,
    });
    return response.data;
};

// Xoá item theo productId (RestaurantDetail dùng)
export const deleteCartItemByProduct = async ({
                                                  accountId,
                                                  productId,
                                                  restaurantId,
                                              }) => {
    const response = await axios.delete(
        `${API_BASE_URL}/cart/items/${productId}`,
        { params: { accountId, restaurantId } }
    );
    return response.data;
};

// Xoá cả giỏ của 1 nhà hàng
export const clearCartForRestaurant = async ({ accountId, restaurantId }) => {
    const response = await axios.delete(`${API_BASE_URL}/cart`, {
        params: { accountId, restaurantId },
    });
    return response.data;
};
