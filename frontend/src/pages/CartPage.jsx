import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MdRestaurant } from "react-icons/md";
import { HiLocationMarker } from "react-icons/hi";
import '../css/CartPage.css';

const CartPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // restaurantId của quán đang đặt (truyền từ RestaurantDetail)
    const initialRestaurantId = location.state?.restaurantId || null;
    const [restaurantId] = useState(initialRestaurantId);

    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [note, setNote] = useState('');

    const formatPrice = (v) => {
        if (v === null || v === undefined) return '0 đ';
        try {
            const num = typeof v === 'number' ? v : Number(v);
            if (Number.isNaN(num)) return `${v} đ`;
            return num.toLocaleString('vi-VN') + ' đ';
        } catch {
            return `${v} đ`;
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

    // ===== Helpers hiển thị options từ backend =====
    // Giả định CartItemResponse có field: options: Array<{ attributeName, value }>
    const getOptionsText = (item) => {
        if (!item || !item.options || !item.options.length) return '';
        // Ví dụ: "Nhiệt độ: Lạnh, Đá: Bình thường, Topping: Thạch dừa"
        return item.options
            .map((o) =>
                o.attributeName
                    ? `${o.attributeName}: ${o.value}`
                    : o.value
            )
            .join(', ');
    };

    useEffect(() => {
        window.scrollTo(0, 0);

        if (!user) {
            setLoading(false);
            return;
        }

        // Không có restaurantId => không biết đang đặt quán nào
        if (!restaurantId) {
            setLoading(false);
            setError(
                'Không xác định được nhà hàng đang đặt món. Vui lòng quay lại chọn món từ nhà hàng.'
            );
            return;
        }

        const fetchCart = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await axios.get('http://localhost:8080/api/cart', {
                    params: {
                        accountId: user.id,
                        restaurantId: restaurantId,   // LẤY GIỎ CỦA NHÀ HÀNG NÀY
                    },
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
    }, [user, restaurantId]);

    // Khi quay lại trang (Back, mouse button 4, Alt+←, v.v.) thì reload lại giỏ hàng để cập nhật địa chỉ mới
    useEffect(() => {
       const handleFocusOrShow = () => {
           if (!user || !restaurantId) return;

           axios.get('http://localhost:8080/api/cart', {
               params: {
                   accountId: user.id,
                   restaurantId: restaurantId,
               },
           })
               .then((res) => {
                   setCart(res.data);
               })
               .catch((err) => {
                   console.error(err);
               });
       };

       window.addEventListener('focus', handleFocusOrShow);
       window.addEventListener('pageshow', handleFocusOrShow);

       return () => {
           window.removeEventListener('focus', handleFocusOrShow);
           window.removeEventListener('pageshow', handleFocusOrShow);
       };
    }, [user, restaurantId]);

    const handleChangeQuantity = async (item, delta) => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!restaurantId && !cart?.restaurantId) {
            alert('Không xác định được nhà hàng. Vui lòng quay lại chọn món.');
            return;
        }

        const currentQty = item.quantity || 0;
        const newQuantity = currentQty + delta;
        if (newQuantity < 0) return;

        try {
            setUpdating(true);

            const res = await axios.put(
                'http://localhost:8080/api/cart/items/quantity',
                {
                    accountId: user.id,
                    itemId: item.itemId,          // OrderItem.id
                    quantity: newQuantity,        // newQuantity, cho phép = 0 -> xoá dòng
                    restaurantId: cart?.restaurantId || restaurantId || null,
                }
            );

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
        navigate('/checkout', {
            state: {
                cartId: cart?.orderId || null,
                restaurantId: cart?.restaurantId || restaurantId || null,
                note: note || '',
            },
        });
    };

    const handleChangeAddress = () => {
        navigate('/profile');
    };

    const handleBackToRestaurant = () => {
        const resId = cart?.restaurantId || restaurantId;
        if (resId) {
            navigate(`/restaurant/${resId}`);
        } else {
            navigate('/');
        }
    };

    const shippingFee = cart?.shippingFee ?? 0;
    const subtotal = cart?.subtotal ?? 0;
    const total = cart?.total ?? subtotal + shippingFee;

    // ======= Các trạng thái đặc biệt =======
    if (!user) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-empty-text">
                            Bạn cần đăng nhập để xem giỏ hàng và đặt món.
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
        );
    }

    if (loading) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-loading-text">Đang tải giỏ hàng...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Không có restaurantId => show thông báo
    if (!restaurantId && !cart?.restaurantId) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-empty-text">
                            Không xác định được nhà hàng đang đặt món. Vui lòng quay lại chọn món từ nhà hàng.
                        </p>
                        <button
                            type="button"
                            className="cart-back-btn"
                            onClick={() => navigate('/')}
                        >
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasItems) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-empty-text">
                            Giỏ hàng của bạn đang trống. Hãy quay lại chọn món nhé!
                        </p>
                        <button
                            type="button"
                            className="cart-back-btn"
                            onClick={handleBackToRestaurant}
                        >
                            Quay lại chọn món
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-wrapper">
                {/* Tiêu đề */}
                <h1 className="cart-page-title">Xác nhận đơn hàng</h1>

                {/* Nút quay lại chọn món */}
                <div className="cart-back-row">
                    <button
                        type="button"
                        className="cart-back-btn"
                        onClick={handleBackToRestaurant}
                    >
                        ← Quay lại chọn món
                    </button>
                </div>

                {/* Địa chỉ giao hàng */}
                <section className="cart-address-card">
                    <div className="cart-address-left">
                        <HiLocationMarker className="cart-address-icon" />

                        <div className="cart-address-text">
                            <span className="cart-address-label">Địa chỉ giao hàng</span>
                            <div className="cart-address-value">
                                {cart?.shippingAddress || 'Chưa có địa chỉ giao hàng'}
                            </div>
                        </div>
                    </div>
                    <div className="cart-address-right">
                        <button
                            type="button"
                            className="cart-address-change-btn"
                            onClick={handleChangeAddress}
                        >
                            Thay đổi
                        </button>
                    </div>
                </section>

                {/* Nội dung chính: Giỏ hàng (trái) + Chi tiết thanh toán (phải) */}
                <div className="cart-content">
                    {/* Cột trái: giỏ hàng */}
                    <main className="cart-main">
                        <section className="cart-items-card">
                            <header className="cart-restaurant-header">
                                <div className="cart-res-avatar">
                                    <MdRestaurant className="cart-res-avatar-icon" />
                                </div>
                                <div className="cart-res-info">
                                    <div className="cart-res-name">
                                        {cart?.restaurantName || 'Quán ăn'}
                                    </div>
                                    <div className="cart-res-meta">
                                        {cart?.restaurantAddress || 'Địa chỉ quán chưa cập nhật'}
                                    </div>
                                </div>
                            </header>

                            <div className="cart-items-list">
                                {cart.items.map((item) => {
                                    const optionsText = getOptionsText(item);

                                    return (
                                        <div
                                            key={item.itemId || item.productId}
                                            className="cart-item-row"
                                        >
                                            <div className="cart-item-left">
                                                <div className="cart-item-thumb">
                                                    {item.productImage ? (
                                                        <img
                                                            src={item.productImage}
                                                            alt={item.productName}
                                                            className="cart-item-thumb-img"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="cart-item-thumb-placeholder">
                                                            <span className="cart-item-thumb-placeholder-text">
                                                                {item.productName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="cart-item-info">
                                                    <div className="cart-item-name">
                                                        {item.productName}
                                                    </div>

                                                    {/* Dòng hiển thị options */}
                                                    {optionsText && (
                                                        <div className="cart-item-options">
                                                            {optionsText}
                                                        </div>
                                                    )}
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
                                    );
                                })}
                            </div>
                        </section>
                    </main>

                    {/* Cột phải: Chi tiết thanh toán + Ghi chú */}
                    <aside className="cart-sidebar">
                        <section className="cart-summary-card">
                            <h2 className="cart-summary-title">Chi tiết thanh toán</h2>

                            <div className="cart-summary-row">
                                <span>
                                    Tổng giá món
                                    {totalItems > 0 ? ` (${totalItems} món)` : ''}
                                </span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>

                            <div className="cart-summary-row">
                                <span>Phí giao hàng</span>
                                <span>{formatPrice(shippingFee)}</span>
                            </div>

                            <div className="cart-summary-total-row">
                                <span>Tổng thanh toán</span>
                                <span className="cart-summary-total-value">
                                    {formatPrice(total)}
                                </span>
                            </div>
                            <div className="cart-summary-tax-note">Đã bao gồm thuế</div>

                            <button
                                type="button"
                                className="cart-place-order-btn"
                                disabled={!hasItems || updating}
                                onClick={handlePlaceOrder}
                            >
                                Đặt đơn - {formatPrice(total)}
                            </button>
                        </section>

                        <section className="cart-note-card">
                            <div className="cart-note-header">
                                <span>Ghi chú cho quán</span>
                            </div>
                            <textarea
                                className="cart-note-input"
                                rows={3}
                                placeholder="Ví dụ: Không hành, ít đá, gọi trước khi giao..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </section>
                    </aside>
                </div>

                {error && <p className="cart-error-text">{error}</p>}
            </div>
        </div>
    );
};

export default CartPage;