import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/CartPage.css';

const CartPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    const formatPrice = (v) => {
        if (v == null) return '0 ₫';
        try {
            return v.toLocaleString('vi-VN') + ' ₫';
        } catch {
            return `${v} ₫`;
        }
    };

    const hasItems = cart && cart.items && cart.items.length > 0;

    const totalItems = useMemo(
        () =>
            cart && cart.items
                ? cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                : 0,
        [cart]
    );

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchCart = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await axios.get('http://localhost:8080/api/cart', {
                    params: { accountId: user.id },
                });
                setCart(res.data);
            } catch (err) {
                console.error(err);
                setError('Không tải được giỏ hàng. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, [user]);

    const handleChangeQuantity = async (item, delta) => {
        if (!user) {
            navigate('/login');
            return;
        }

        const newQuantity = (item.quantity || 0) + delta;
        if (newQuantity < 0) return;

        try {
            setUpdating(true);
            let res;
            if (newQuantity === 0) {
                // xoá món
                res = await axios.delete(
                    `http://localhost:8080/api/cart/items/${item.productId}`,
                    {
                        params: { accountId: user.id },
                    }
                );
            } else {
                // cập nhật số lượng
                res = await axios.put('http://localhost:8080/api/cart/items', {
                    accountId: user.id,
                    productId: item.productId,
                    quantity: newQuantity,
                });
            }
            setCart(res.data);
        } catch (err) {
            console.error(err);
            alert('Không cập nhật được số lượng. Vui lòng thử lại.');
        } finally {
            setUpdating(false);
        }
    };

    const handlePlaceOrder = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!hasItems) return;

        // Flow: Cart -> Checkout -> PayOS
        navigate('/checkout'); // màn checkout sẽ xử lý PayOS sau
    };

    const handleChangeAddress = () => {
        navigate('/profile');
    };

    const handleBackToRestaurant = () => {
        navigate('/');
    };

    if (!user) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <div className="cart-main">
                        <div className="cart-panel">
                            <h1 className="cart-title">Giỏ hàng</h1>
                            <p className="cart-empty-message">
                                Bạn cần đăng nhập để xem và đặt món.
                            </p>
                            <button
                                type="button"
                                className="cart-login-btn"
                                onClick={() => navigate('/login')}
                            >
                                Đăng nhập ngay
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <div className="cart-main">
                        <div className="cart-panel">
                            <h1 className="cart-title">Giỏ hàng</h1>
                            <p className="cart-loading">Đang tải giỏ hàng...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-wrapper">
                {/* Cột trái: danh sách món */}
                <main className="cart-main">
                    <div className="cart-panel">
                        <h1 className="cart-title">Giỏ hàng</h1>

                        {error && <p className="cart-error">{error}</p>}

                        {!hasItems ? (
                            <>
                                <p className="cart-empty-message">
                                    Chưa có món nào trong giỏ. Hãy quay lại chọn món nhé!
                                </p>
                                <button
                                    type="button"
                                    className="cart-login-btn"
                                    onClick={handleBackToRestaurant}
                                >
                                    Về trang chọn quán
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="cart-restaurant-header">
                                    <div>
                                        <div className="cart-res-name">
                                            {cart.restaurantName || 'Quán ăn'}
                                        </div>
                                        <div className="cart-res-meta">Giao ngay • ~25 phút</div>
                                    </div>
                                </div>

                                <div className="cart-items-list">
                                    {cart.items.map((item) => (
                                        <div key={item.productId} className="cart-item-row">
                                            <div className="cart-item-left">
                                                <div className="cart-item-name">
                                                    {item.productName}
                                                </div>
                                                {/* chỗ ghi chú có thể thêm sau */}
                                                <div className="cart-item-price-mobile">
                                                    {formatPrice(item.unitPrice)}
                                                </div>
                                            </div>

                                            <div className="cart-item-right">
                                                <div className="cart-qty-control">
                                                    <button
                                                        type="button"
                                                        className="cart-qty-btn"
                                                        onClick={() => handleChangeQuantity(item, -1)}
                                                        disabled={updating}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="cart-qty-value">
                            {item.quantity}
                          </span>
                                                    <button
                                                        type="button"
                                                        className="cart-qty-btn"
                                                        onClick={() => handleChangeQuantity(item, +1)}
                                                        disabled={updating}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="cart-item-total">
                                                    {formatPrice(item.lineTotal)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </main>

                {/* Cột phải: tóm tắt + địa chỉ */}
                <aside className="cart-sidebar">
                    <div className="cart-summary-panel">
                        <h2 className="cart-summary-title">Tóm tắt đơn hàng</h2>

                        <div className="cart-summary-row">
                            <span>Tạm tính</span>
                            <span>{formatPrice(cart?.subtotal)}</span>
                        </div>
                        <div className="cart-summary-row">
                            <span>Phí giao hàng</span>
                            <span>{formatPrice(cart?.shippingFee)}</span>
                        </div>

                        <div className="cart-summary-total-row">
                            <span>Tổng cộng</span>
                            <span className="cart-summary-total-value">
                {formatPrice(cart?.total)}
              </span>
                        </div>

                        <button
                            type="button"
                            className="cart-order-btn"
                            disabled={!hasItems || updating}
                            onClick={handlePlaceOrder}
                        >
                            Đặt hàng
                            {totalItems > 0 ? ` (${totalItems} món)` : ''}
                        </button>
                    </div>

                    <div className="cart-address-panel">
                        <div className="cart-address-header">Địa chỉ giao hàng</div>
                        <div className="cart-address-text">
                            {cart?.shippingAddress || 'Chưa có địa chỉ giao hàng'}
                        </div>
                        <button
                            type="button"
                            className="cart-address-change-btn"
                            onClick={handleChangeAddress}
                        >
                            Thay đổi
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CartPage;
