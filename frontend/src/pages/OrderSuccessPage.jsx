import React, {useContext, useEffect, useMemo} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "../css/OrderSuccessPage.css";

const OrderSuccessPage = () => {
    const { search } = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const query = useMemo(() => new URLSearchParams(search), [search]);

    const code = query.get("code");        // PayOS trả về code (thường "00" là OK)
    const orderCode = query.get("orderCode"); // PayOS trả về orderCode bạn đã gửi

    // Tách orderId từ orderCode (giống logic backend: orderId + 6 số nanoTime)
    const orderId = useMemo(() => {
        if (!orderCode || orderCode.length <= 6) return null;
        const idStr = orderCode.slice(0, -6);
        const idNum = parseInt(idStr, 10);
        return Number.isNaN(idNum) ? null : idNum;
    }, [orderCode]);

    // Xác nhận lại với backend là đơn này đã thanh toán thành công
    useEffect(() => {
        if (!orderId) return;
        axios.post("http://localhost:8080/api/payment/confirm-success", null, {
            params: { orderId },
        }).catch((err) => {
            console.error("Failed to confirm payment success: ", err);
        });
    }, [orderId]);

    // Sau khi thanh toán thành công → xoá giỏ hàng của user
    // useEffect(() => {
    //    const clearCartAfterPayment = async () => {
    //        if (!user) return;
    //        try {
    //            await axios.delete("http://localhost:8080/api/cart", {
    //                params: { accountId: user.id },
    //            });
    //        } catch (e) {
    //            console.error("Failed to clear cart after payment: ", e);
    //        }
    //    };
    //
    //    clearCartAfterPayment();
    // }, [user]);

    const handleGoHome = () => {
        navigate("/");
    };

    const handleGoToOrders = () => {
        // tuỳ bạn: /orders, /profile?tab=orders, ...
        navigate("/orders");
    };

    return (
        <div className="order-success-page">
            <div className="order-success-card">
                <CheckCircleOutlined className="order-success-icon" />
                <h1 className="order-success-title">
                    Thanh toán thành công!
                </h1>

                {orderId && (
                    <p className="order-success-order">
                        Mã đơn hàng của bạn:{" "}
                        <strong>#{orderId}</strong>
                    </p>
                )}

                <p className="order-success-text">
                    Đơn hàng đã được ghi nhận. Quán sẽ xác nhận và chuẩn bị món
                    trong thời gian sớm nhất.
                </p>

                {/* Nếu code != "00" thì có thể hiển thị cảnh báo nhẹ,
                    nhưng để đơn giản, chỉ dùng cho "success" */}
                {code && code !== "00" && (
                    <p className="order-success-warning">
                        Lưu ý: Mã phản hồi từ PayOS: {code}.
                        Nếu có vấn đề, vui lòng liên hệ hỗ trợ.
                    </p>
                )}

                <div className="order-success-actions">
                    <button
                        type="button"
                        className="order-success-btn primary"
                        onClick={handleGoHome}
                    >
                        Về trang chủ
                    </button>
                    <button
                        type="button"
                        className="order-success-btn secondary"
                        onClick={handleGoToOrders}
                    >
                        Xem đơn hàng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
