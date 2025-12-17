import React, {useEffect, useMemo, useState} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import { confirmVnpayReturn } from "../services/paymentService";
import "../css/OrderSuccessPage.css";

const OrderSuccessPage = () => {
    const { search } = useLocation();
    const navigate = useNavigate();

    const query = useMemo(() => new URLSearchParams(search), [search]);

    const [paymentOk, setPaymentOk] = useState(true);
    const [paymentNote, setPaymentNote] = useState("");

    // PayOS
    const payosCode = query.get("code");
    const orderCode = query.get("orderCode");

    // VNPay
    const vnpTxnRef = query.get("vnp_TxnRef");
    const vnpResponseCode = query.get("vnp_ResponseCode");

    // Tách orderId từ orderCode (giống logic backend: orderId + 6 số nanoTime)
    const orderId = useMemo(() => {
        // VNPay: txnRef = orderId + 6 digits
        if (vnpTxnRef && vnpTxnRef.length > 6) {
            const idStr = vnpTxnRef.slice(0, -6);
            const idNum = parseInt(idStr, 10);
            return Number.isNaN(idNum) ? null : idNum;
        }

        // PayOS: orderCode = orderId + 6 digits
        if (orderCode && orderCode.length > 6) {
            const idStr = orderCode.slice(0, -6);
            const idNum = parseInt(idStr, 10);
            return Number.isNaN(idNum) ? null : idNum;
        }
        return null;
    }, [orderCode, vnpTxnRef]);

    // Xác nhận lại với backend là đơn này đã thanh toán thành công
    useEffect(() => {
        // VNPay: verify chữ ký trên BE rồi mới update order
        if (vnpTxnRef) {
            const paramsObj = {};
            // chuyển toàn bộ query string thành object để BE verify
            for (const [k, v] of query.entries()) {
                paramsObj[k] = v;
            }

            confirmVnpayReturn(paramsObj)
                .then((res) => {
                    // res = { verified, orderId, message }
                    if (!res?.verified) {
                        setPaymentOk(false);
                        setPaymentNote(res?.message || "VNPay verify failed");
                        return;
                    }
                    if (String(res?.message || "").startsWith("SUCCESS")) {
                        setPaymentOk(true);
                        setPaymentNote("");
                    } else {
                        setPaymentOk(false);
                        setPaymentNote(res?.message || "VNPay payment failed");
                    }
                })
                .catch((err) => {
                    console.error("Failed to confirm VNPay return: ", err);
                    setPaymentOk(false);
                    setPaymentNote("Không xác nhận được kết quả VNPay (lỗi gọi API)");
                });
            return;
        }

        // PayOS: hiện tại dùng confirm-success (client confirm)
        if (!orderId) return;
        if (payosCode && payosCode !== "00") {
            setPaymentOk(false);
            setPaymentNote(`PayOS code: ${payosCode}`);
        }
        axios.post("http://localhost:8080/api/payment/confirm-success", null, {
            params: { orderId },
        }).catch((err) => {
            console.error("Failed to confirm payment success: ", err);
        });
    }, [orderId, query, vnpTxnRef, payosCode]);

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
        // Điều hướng đến trang chi tiết đơn hàng
        navigate("/orders");
    };

    return (
        <div className="order-success-page">
            <div className="order-success-card">
                <CheckCircleOutlined className="order-success-icon" />
                <h1 className="order-success-title">
                    {paymentOk ? "Thanh toán thành công!" : "Thanh toán chưa thành công"}
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
                {!paymentOk && (
                    <p className="order-success-warning">
                        {paymentNote || "Giao dịch chưa thành công. Nếu bạn đã bị trừ tiền, vui lòng liên hệ hỗ trợ."}
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