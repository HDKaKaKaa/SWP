package com.shopeefood.backend.payment.vnpay;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Transaction;
import com.shopeefood.backend.repository.OrderRepository;
import com.shopeefood.backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnpayService {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;

    @Value("${vnpay.tmn-code}")
    private String tmnCode;

    @Value("${vnpay.hash-secret}")
    private String hashSecret;

    @Value("${vnpay.pay-url}")
    private String payUrl;

    @Value("${vnpay.return-url}")
    private String returnUrl;

    /**
     * Create VNPay payment URL for an existing order.
     *
     * Flow requested by you (DEV MODE):
     *   /checkout -> VNPay sandbox -> /order-success
     * so returnUrl points directly to FE route.
     */
    @Transactional
    public String createPaymentUrl(Integer orderId, String clientIp) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        BigDecimal total = order.getTotalAmount();
        if (total == null) total = BigDecimal.ZERO;

        long amountVnd = total.longValue();
        long vnpAmount = amountVnd * 100L; // VNPay requires *100

        // VNPay requires unique vnp_TxnRef.
        // Reuse your PayOS idea: orderId + 6 digits
        String nano = String.valueOf(System.nanoTime());
        String txnRef = orderId + nano.substring(Math.max(0, nano.length() - 6));

        // Create/Update transaction row (PENDING)
        Transaction txn = transactionRepository.findByTransactionCode(txnRef)
                .orElse(new Transaction());
        txn.setOrder(order);
        txn.setAmount(total);
        txn.setTransactionCode(txnRef);
        txn.setStatus("PENDING");
        txn.setGatewayResponse(null);
        transactionRepository.save(txn);

        // Update order payment method
        order.setPaymentMethod("VNPAY");
        orderRepository.save(order);

        // VNPay time format
        SimpleDateFormat df = new SimpleDateFormat("yyyyMMddHHmmss");
        df.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String createDate = df.format(new Date());

        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        cal.add(Calendar.MINUTE, 15);
        String expireDate = df.format(cal.getTime());

        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", String.valueOf(vnpAmount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", "Thanh toan don hang #" + orderId);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", (clientIp == null || clientIp.isBlank()) ? "127.0.0.1" : clientIp);
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        String query = VnpayUtils.buildQueryString(params);
        String secureHash = VnpayUtils.hmacSHA512(hashSecret, query);

        return payUrl + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    /**
     * Verify VNPay params + update order/transaction.
     * Called by FE (order-success page) in DEV MODE.
     */
    @Transactional
    public ConfirmResult confirmReturn(Map<String, String> vnpParams) {
        if (vnpParams == null || vnpParams.isEmpty()) {
            return new ConfirmResult(false, null, "Empty params");
        }

        String receivedHash = vnpParams.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return new ConfirmResult(false, null, "Missing vnp_SecureHash");
        }

        String dataToSign = VnpayUtils.buildDataToSign(vnpParams);
        String expected = VnpayUtils.hmacSHA512(hashSecret, dataToSign);

        if (!expected.equalsIgnoreCase(receivedHash)) {
            return new ConfirmResult(false, null, "Invalid signature");
        }

        String respCode = vnpParams.get("vnp_ResponseCode");
        String txnRef = vnpParams.get("vnp_TxnRef");
        Integer orderId = extractOrderIdFromTxnRef(txnRef);

        if (orderId == null) {
            return new ConfirmResult(false, null, "Cannot extract orderId from vnp_TxnRef");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // Update transaction
        Transaction txn = transactionRepository.findByTransactionCode(txnRef)
                .orElse(new Transaction());
        txn.setOrder(order);
        txn.setAmount(order.getTotalAmount());
        txn.setTransactionCode(txnRef);
        txn.setGatewayResponse(new TreeMap<>(vnpParams).toString());

        boolean success = "00".equals(respCode);
        txn.setStatus(success ? "SUCCESS" : "FAILED");
        transactionRepository.save(txn);

        // Update order
        order.setPaymentMethod("VNPAY");
        if (success) {
            order.setStatus("PAID");
        }
        orderRepository.save(order);

        return new ConfirmResult(true, orderId, success ? "SUCCESS" : ("FAILED:" + respCode));
    }

    private Integer extractOrderIdFromTxnRef(String txnRef) {
        if (txnRef == null || txnRef.length() <= 6) return null;
        String idStr = txnRef.substring(0, txnRef.length() - 6);
        try {
            return Integer.parseInt(idStr);
        } catch (Exception e) {
            return null;
        }
    }

    public record ConfirmResult(boolean verified, Integer orderId, String message) {}
}