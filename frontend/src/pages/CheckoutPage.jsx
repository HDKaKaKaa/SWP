import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MdRestaurant } from 'react-icons/md';
import { HiLocationMarker } from 'react-icons/hi';
import { FaCreditCard } from 'react-icons/fa';
import '../css/CheckoutPage.css';

const CheckoutPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    const formatPrice = (v) => {
        if (!v) return '0 đ';
        try {
            return v.toLocaleString('vi-VN') + ' đ';
        } catch {
            return `${v} đ`;
        }
    };

    // Load cart giống CartPage nhưng chỉ hiển thị read-only
    useEffect(() => {
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
                setError('Không tải được thông tin đơn hàng. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, [user]);

    const shippingFee = useMemo(
        () => (cart?.shippingFee ?? 15000),
        [cart]
    );

    const subtotal = useMemo(
        () => (cart?.subtotal ?? 0),
        [cart]
    );

    const total = useMemo(
        () => (cart?.total ?? subtotal + shippingFee),
        [cart, subtotal, shippingFee]
    );

    const totalItems = useMemo(
        () => cart?.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ?? 0,
        [cart]
    );

    const handleChangeAddress = () => {
        // Không cho sửa trực tiếp trên checkout, chỉ điều hướng về nơi được phép sửa
        navigate('/cart');
        // hoặc navigate('/profile'); tuỳ flow bạn đang dùng cho update address
    };

    const handleBackToCart = () => {
        navigate('/cart');
    };

    const handlePayWithPayOS = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!cart || !cart.items || cart.items.length === 0) return;

        try {
            setProcessing(true);

            // TODO: sau này gọi API tạo order + transaction + link PayOS ở backend
            // Ví dụ:
            // const res = await axios.post('http://localhost:8080/api/payos/checkout', {
            //   orderId: cart.orderId,
            //   totalAmount: total,
            // });
            // window.location.href = res.data.paymentUrl;

            console.log('Thanh toán với PayOS', {
                orderId: cart.orderId,
                paymentMethod: 'PAYOS',
                total,
            });
            alert('Preview UI: Chỗ này sẽ redirect sang PayOS sau khi backend xong.');
        } catch (err) {
            console.error(err);
            setError('Không khởi tạo được thanh toán. Vui lòng thử lại.');
        } finally {
            setProcessing(false);
        }
    };

    // ======= Các trạng thái đặc biệt =======
    if (!user) {
        return (
            <div className="checkout-page">
                <div className="checkout-wrapper">
                    <h1 className="checkout-title">Thanh toán đơn hàng</h1>
                    <div className="checkout-empty-card">
                        <p className="checkout-empty-text">
                            Bạn cần đăng nhập để tiếp tục thanh toán.
                        </p>
                        <button
                            type="button"
                            className="checkout-login-btn"
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
            <div className="checkout-page">
                <div className="checkout-wrapper">
                    <h1 className="checkout-title">Thanh toán đơn hàng</h1>
                    <div className="checkout-empty-card">
                        <p className="checkout-empty-text">
                            Đang tải thông tin đơn hàng...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="checkout-page">
                <div className="checkout-wrapper">
                    <h1 className="checkout-title">Thanh toán đơn hàng</h1>
                    <div className="checkout-empty-card">
                        <p className="checkout-empty-text">
                            Không có món nào trong đơn hàng. Vui lòng quay lại giỏ hàng.
                        </p>
                        <button
                            type="button"
                            className="checkout-back-btn"
                            onClick={handleBackToCart}
                        >
                            Quay lại giỏ hàng
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="checkout-wrapper">
                <h1 className="checkout-title">Thanh toán đơn hàng</h1>

                <div className="checkout-content">
                    {/* Cột trái: Thông tin giao hàng + Phương thức thanh toán */}
                    <main className="checkout-main">
                        {/* Thông tin giao hàng */}
                        <section className="checkout-card">
                            <header className="checkout-address-header">
                                <div className="checkout-address-icon-wrap">
                                    <HiLocationMarker className="checkout-address-icon" />
                                </div>
                                <div className="checkout-address-text-wrap">
                                    <div className="checkout-address-label">
                                        Địa chỉ giao hàng
                                    </div>
                                    <div className="checkout-address-main">
                                        <span className="checkout-address-name">
                                            {user?.fullName || user?.username || 'Khách hàng'}
                                        </span>
                                        {user?.phone && (
                                            <span className="checkout-address-phone">
                                                • {user.phone}
                                            </span>
                                        )}
                                    </div>
                                    <div className="checkout-address-detail">
                                        {cart.shippingAddress || 'Chưa có địa chỉ giao hàng'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="checkout-change-address-btn"
                                    onClick={handleChangeAddress}
                                >
                                    Thay đổi
                                </button>
                            </header>

                            <div className="checkout-restaurant-info">
                                <div className="checkout-res-avatar">
                                    <MdRestaurant className="checkout-res-avatar-icon" />
                                </div>
                                <div className="checkout-res-text">
                                    <div className="checkout-res-name">
                                        {cart.restaurantName || 'Quán ăn'}
                                    </div>
                                    <div className="checkout-res-address">
                                        {cart.restaurantAddress || 'Địa chỉ quán chưa cập nhật'}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Phương thức thanh toán – chỉ PayOS */}
                        <section className="checkout-card">
                            <h2 className="checkout-section-title">Phương thức thanh toán</h2>
                            <div className="checkout-payment-methods">
                                <div className="checkout-payment-option checkout-payment-option--active">
                                    <div className="checkout-payment-option-left">
                                        <span className="checkout-radio-wrapper">
                                            <span className="checkout-radio-circle checkout-radio-circle--checked" />
                                        </span>
                                        <div>
                                            <div className="checkout-payment-title">
                                                <FaCreditCard className="checkout-payment-icon" />
                                                <span>Thanh toán qua PayOS</span>
                                            </div>
                                            <div className="checkout-payment-desc">
                                                Dự án demo chỉ hỗ trợ thanh toán online qua PayOS.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-note-payos">
                                Bạn sẽ được chuyển đến trang thanh toán PayOS để hoàn tất giao dịch.
                            </div>
                        </section>
                    </main>

                    {/* Cột phải: Tóm tắt đơn hàng */}
                    <aside className="checkout-sidebar">
                        <section className="checkout-card checkout-summary-card">
                            <h2 className="checkout-section-title">Đơn hàng của bạn</h2>

                            <div className="checkout-items-list">
                                {cart.items.map((item) => (
                                    <div
                                        key={item.productId}
                                        className="checkout-item-row"
                                    >
                                        <div className="checkout-item-main">
                                            <div className="checkout-item-name">
                                                {item.productName}
                                            </div>
                                            <div className="checkout-item-meta">
                                                x{item.quantity} · {formatPrice(item.price)}
                                            </div>
                                        </div>
                                        <div className="checkout-item-total">
                                            {formatPrice(item.lineTotal)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-summary-row">
                                <span>
                                    Tổng giá món
                                    {totalItems > 0 ? ` (${totalItems} món)` : ''}
                                </span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="checkout-summary-row">
                                <span>Phí giao hàng</span>
                                <span>{formatPrice(shippingFee)}</span>
                            </div>
                            <div className="checkout-summary-divider" />
                            <div className="checkout-summary-row checkout-summary-row-total">
                                <span>Tổng cộng</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                            <div className="checkout-summary-tax-note">
                                Đã bao gồm thuế (nếu có)
                            </div>

                            <button
                                type="button"
                                className="checkout-back-btn checkout-summary-back-btn"
                                onClick={handleBackToCart}
                                disabled={processing}
                            >
                                Quay lại giỏ hàng
                            </button>

                            <button
                                type="button"
                                className="checkout-pay-btn"
                                onClick={handlePayWithPayOS}
                                disabled={processing}
                            >
                                {processing
                                    ? 'Đang xử lý...'
                                    : `Thanh toán với PayOS - ${formatPrice(total)}`}
                            </button>
                        </section>

                        {error && (
                            <p className="checkout-error-text">
                                {error}
                            </p>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
