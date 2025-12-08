import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { MdRestaurant } from "react-icons/md";
import { FaCreditCard, FaUserCheck } from "react-icons/fa";
import "../css/CheckoutPage.css";

const CheckoutPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Nhận từ CartPage
    const { cartId: initialCartId, restaurantId: initialRestaurantId } = location.state || {};

    const [cartId] = useState(initialCartId || null);
    const [restaurantId] = useState(initialRestaurantId || null);

    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Thông tin khách hàng lấy từ API profile
    const [customerInfo, setCustomerInfo] = useState({
        fullName: "",
        phone: "",
    });

    const formatPrice = (v) => {
        if (v === null || v === undefined) return "0 đ";
        try {
            const num = typeof v === "number" ? v : Number(v);
            if (Number.isNaN(num)) return `${v} đ`;
            return num.toLocaleString("vi-VN") + " đ";
        } catch {
            return `${v} đ`;
        }
    };

    // ===== Lấy cart + profile để hiển thị =====
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Không có restaurantId => không biết đang checkout đơn của quán nào
        if (!restaurantId) {
            setLoading(false);
            setError("Không xác định được nhà hàng đang thanh toán. Vui lòng quay lại giỏ hàng.");
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [cartRes, profileRes] = await Promise.all([
                    axios.get("http://localhost:8080/api/cart", {
                        params: {
                            accountId: user.id,
                            restaurantId: restaurantId,  // LẤY ĐÚNG CART CỦA NHÀ HÀNG NÀY
                        },
                        withCredentials: true,
                    }),
                    axios.get(`http://localhost:8080/api/customer/profile/${user.id}`),
                ]);

                setCart(cartRes.data);

                const profile = profileRes.data || {};
                setCustomerInfo({
                    fullName: profile.fullName || "",
                    phone: profile.phone || "",
                });
            } catch (e) {
                console.error(e);
                setError("Không tải được thông tin đơn hàng.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, restaurantId]);

    // Khi quay lại trang (Back, mouse button 4, Alt+←, v.v.) thì reload lại cart + profile để cập nhật địa chỉ mới
    useEffect(() => {
        const handleFocusOrShow = () => {
            if (!user || !restaurantId) return;

            Promise.all([
                axios.get("http://localhost:8080/api/cart", {
                    params: {
                        accountId: user.id,
                        restaurantId: restaurantId,
                    },
                    withCredentials: true,
                }),
                axios.get(`http://localhost:8080/api/customer/profile/${user.id}`),
            ])
                .then(([cartRes, profileRes]) => {
                    setCart(cartRes.data);

                    const profile = profileRes.data || {};
                    setCustomerInfo({
                        fullName: profile.fullName || "",
                        phone: profile.phone || "",
                    });
                })
                .catch((err) => {
                    console.error(err);
                });
        };

        window.addEventListener("focus", handleFocusOrShow);
        window.addEventListener("pageshow", handleFocusOrShow);

        return () => {
            window.removeEventListener("focus", handleFocusOrShow);
            window.removeEventListener("pageshow", handleFocusOrShow);
        };
    }, [user, restaurantId]);


    const shippingFee = useMemo(
        () => cart?.shippingFee ?? 0,
        [cart]
    );

    const subtotal = useMemo(
        () => cart?.subtotal ?? 0,
        [cart]
    );

    const total = useMemo(
        () => cart?.total ?? subtotal + shippingFee,
        [cart, subtotal, shippingFee]
    );

    const totalItems = useMemo(
        () => cart?.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ?? 0,
        [cart]
    );

    // ==== Helpers hiển thị options từ backend ====
    // CartItemResponse có options: Array<{ attributeName, value, priceAdjustment }>
    const getOptionsText = (item) => {
        if (!item || !item.options || !item.options.length) return "";
        return item.options
            .map((o) =>
                o.attributeName
                    ? `${o.attributeName}: ${o.value}`
                    : o.value
            )
            .join(", ");
    };

    // Tên + sđt hiển thị: ưu tiên profile, fallback về user / username
    const displayName =
        customerInfo.fullName ||
        user?.fullName ||
        user?.username ||
        "Khách hàng";

    const displayPhone =
        customerInfo.phone ||
        user?.phone ||
        "";

    const handleBackToCart = () => {
        const resId = cart?.restaurantId || restaurantId;
        if (resId) {
            navigate("/cart", {
                state: { restaurantId: resId },
            });
        } else {
            navigate("/cart");
        }
    };

    // // ===== Nút Thanh toán PayOS =====
    // const handlePayWithPayOS = async () => {
    //     if (!user) {
    //         navigate("/login");
    //         return;
    //     }
    //     if (!cart || !cart.items || cart.items.length === 0) return;
    //
    //     const orderId = cart.orderId || cart.order?.id || cart.id || cartId;
    //
    //     if (!orderId) {
    //         setError("Không tìm thấy mã đơn hàng (orderId) để thanh toán.");
    //         return;
    //     }
    //
    //     try {
    //         setProcessing(true);
    //         setError(null);
    //
    //         const res = await axios.post(
    //             `http://localhost:8080/api/payment/create-link/${orderId}`,
    //             {},
    //             { withCredentials: true }
    //         );
    //
    //         const data = res.data; // PaymentLinkDTO
    //         if (data && data.checkoutUrl) {
    //             window.location.href = data.checkoutUrl;
    //         } else {
    //             setError("Không nhận được link thanh toán từ PayOS.");
    //         }
    //     } catch (e) {
    //         console.error(e);
    //         setError("Không khởi tạo được thanh toán PayOS.");
    //     } finally {
    //         setProcessing(false);
    //     }
    // };

    // ===== Nút Giả Lập Thanh toán thành công =====
    const handleSimulatePaySuccess = async () => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (!cart || !cart.items || cart.items.length === 0) return;

        const orderId = cart.orderId || cart.order?.id || cart.id || cartId;

        if (!orderId) {
            setError("Không tìm thấy mã đơn hàng (orderId) để giả lập thanh toán.");
            return;
        }

        try {
            setProcessing(true);
            setError(null);

            await axios.post(
                `http://localhost:8080/api/payment/simulate/success/${orderId}`,
                {},
                {withCredentials: true}
            );

            // === TẠO orderCode ĐÚNG FORMAT BACKEND ===
            const today = new Date();
            const yyyyMMdd = today.toISOString().slice(0, 10).replace(/-/g, "");

            const paddedId = orderId.toString().padStart(4, "0");

            const fakeOrderCode = `FO${yyyyMMdd}${paddedId}`;

            alert("Thanh toán giả lập thành công!");

            // Điều hướng sang OrderSuccessPage với orderCode đúng chuẩn
            navigate(`/order-success?code=00&orderCode=${fakeOrderCode}`);
        } catch (e) {
            console.error(e);
            setError("Không giả lập được thanh toán. Kiểm tra lại backend.");
        } finally {
            setProcessing(false);
        }
    };


            // ========== Render các trạng thái ==========

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
                            onClick={() => navigate("/login")}
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

    // Không biết nhà hàng nào
    if (!restaurantId && !cart?.restaurantId) {
        return (
            <div className="checkout-page">
                <div className="checkout-wrapper">
                    <h1 className="checkout-title">Thanh toán đơn hàng</h1>
                    <div className="checkout-empty-card">
                        <p className="checkout-empty-text">
                            Không xác định được nhà hàng đang thanh toán. Vui lòng quay lại giỏ hàng.
                        </p>
                        <button
                            type="button"
                            className="checkout-back-btn"
                            onClick={() => navigate("/cart")}
                        >
                            Quay lại giỏ hàng
                        </button>
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

    // ========== UI chính ==========
    return (
        <div className="checkout-page">
            <div className="checkout-wrapper">
                <h1 className="checkout-title">Thanh toán đơn hàng</h1>

                <div className="checkout-content">
                    {/* Cột trái */}
                    <main className="checkout-main">
                        {/* Địa chỉ giao hàng */}
                        <section className="checkout-card">
                            <header className="checkout-address-header">
                                <div className="checkout-address-icon-wrap">
                                    <FaUserCheck className="checkout-address-icon" />
                                </div>

                                <div className="checkout-address-text-wrap">
                                    <div className="checkout-address-label">
                                        Thông tin giao hàng
                                    </div>

                                    <div className="checkout-address-main">
                                        <span className="checkout-address-name">
                                            {displayName}
                                        </span>
                                        {displayPhone && (
                                            <span className="checkout-address-phone">
                                                • {displayPhone}
                                            </span>
                                        )}
                                    </div>

                                    <div className="checkout-address-detail">
                                        <span className="checkout-address-detail-label">
                                            Địa chỉ:{" "}
                                        </span>
                                        <span>
                                            {cart.shippingAddress ||
                                                "Chưa có địa chỉ giao hàng"}
                                        </span>
                                    </div>
                                </div>
                            </header>

                            <div className="checkout-restaurant-info">
                                <div className="checkout-res-avatar">
                                    <MdRestaurant className="checkout-res-avatar-icon" />
                                </div>
                                <div className="checkout-res-text">
                                    <div className="checkout-res-name">
                                        {cart.restaurantName || "Quán ăn"}
                                    </div>
                                    <div className="checkout-res-address">
                                        {cart.restaurantAddress ||
                                            "Địa chỉ quán chưa cập nhật"}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Phương thức thanh toán */}
                        <section className="checkout-card">
                            <h2 className="checkout-section-title">
                                Phương thức thanh toán
                            </h2>
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
                                                Dự án demo chỉ hỗ trợ thanh toán online
                                                qua PayOS.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-note-payos">
                                Bạn sẽ được chuyển đến trang thanh toán PayOS để hoàn tất
                                giao dịch.
                            </div>
                        </section>
                    </main>

                    {/* Cột phải – tóm tắt đơn hàng */}
                    <aside className="checkout-sidebar">
                        <section className="checkout-card checkout-summary-card">
                            <h2 className="checkout-section-title">
                                Đơn hàng của bạn
                            </h2>

                            <div className="checkout-items-list">
                                {cart.items.map((item) => {
                                    const optionsText = getOptionsText(item);

                                    return (
                                        <div key={item.itemId || item.productId} className="checkout-item-row">
                                            <div className="checkout-item-main">
                                                <div className="checkout-item-title-row">
                                                    <span className="checkout-item-name">
                                                        {item.productName}
                                                    </span>
                                                    <span className="checkout-item-meta">
                                                        x{item.quantity}
                                                    </span>
                                                </div>

                                                {/* === HIỂN THỊ OPTIONS === */}
                                                {optionsText && (
                                                    <div className="checkout-item-options">
                                                        {optionsText}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="checkout-item-total">
                                                {formatPrice(item.lineTotal)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="checkout-summary-row">
                                <span>
                                    Tổng giá món
                                    {totalItems > 0
                                        ? ` (${totalItems} món)`
                                        : ""}
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

                            {/*<button*/}
                            {/*    type="button"*/}
                            {/*    className="checkout-pay-btn"*/}
                            {/*    onClick={handlePayWithPayOS}*/}
                            {/*    disabled={processing}*/}
                            {/*>*/}
                            {/*    {processing*/}
                            {/*        ? "Đang xử lý..."*/}
                            {/*        : `Thanh toán với PayOS - ${formatPrice(*/}
                            {/*            total*/}
                            {/*        )}`}*/}
                            {/*</button>*/}

                            {/* Nút DEV: giả lập thanh toán thành công */}
                            <button
                                type="button"
                                className="checkout-pay-btn checkout-pay-btn-simulate"
                                onClick={handleSimulatePaySuccess}
                                disabled={processing}
                            >
                                Giả lập thanh toán thành công (dev)
                            </button>

                            {error && (
                                <p
                                    className="checkout-error-text"
                                    style={{ marginTop: 8 }}
                                >
                                    {error}
                                </p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;