package com.shopeefood.backend.service;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.PaymentGateway;
import com.shopeefood.backend.entity.Transaction;
import com.shopeefood.backend.repository.OrderRepository;
import com.shopeefood.backend.repository.PaymentGatewayRepository;
import com.shopeefood.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PaymentSimulationService {

    private static final String ORDER_STATUS_CART = "CART";
    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final String ORDER_STATUS_PAID = "PAID";

    private static final String TX_STATUS_PENDING = "PENDING";
    private static final String TX_STATUS_SUCCESS = "SUCCESS";
    private static final String TX_STATUS_FAILED = "FAILED";

    private static final String GATEWAY_CODE_PAYOS = "PAYOS";

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private PaymentGatewayRepository paymentGatewayRepository;

    /**
     * Giả lập callback thanh toán thành công từ PayOS (dev only).
     * - Chỉ cho phép khi order đang ở CART hoặc PENDING.
     * - Tạo Transaction SUCCESS.
     * - Set order.status = PAID.
     */
    @Transactional
    public void simulatePaymentSuccess(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        String status = order.getStatus();

        // Nếu đã PAID rồi thì coi như idempotent, không làm gì thêm
        if (ORDER_STATUS_PAID.equalsIgnoreCase(status)) {
            return;
        }

        // Chỉ cho phép giả lập khi đang CART hoặc PENDING
        if (!ORDER_STATUS_CART.equalsIgnoreCase(status)
                && !ORDER_STATUS_PENDING.equalsIgnoreCase(status)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ORDER_STATUS_NOT_PAYABLE"
            );
        }

        // Lấy gateway PAYOS (nếu không có thì để null cũng được)
        PaymentGateway gateway = paymentGatewayRepository
                .findByCode(GATEWAY_CODE_PAYOS)
                .orElse(null);

        BigDecimal amount = order.getTotalAmount();
        if (amount == null) {
            // fallback: subtotal + shippingFee
            BigDecimal subtotal = order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ZERO;
            BigDecimal shipping = order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO;
            amount = subtotal.add(shipping);
        }

        // Nếu đã có Transaction SUCCESS cho order này thì không tạo thêm (idempotent)
        List<Transaction> existingTxs = transactionRepository.findByOrder(order);
        Optional<Transaction> successTxOpt = existingTxs.stream()
                .filter(tx -> TX_STATUS_SUCCESS.equalsIgnoreCase(tx.getStatus()))
                .findFirst();

        if (successTxOpt.isEmpty()) {
            // Tạo transaction SUCCESS mới
            Transaction tx = new Transaction();
            tx.setOrder(order);
            tx.setPaymentGateway(gateway);
            tx.setAmount(amount);
            tx.setStatus(TX_STATUS_SUCCESS);

            String txCode = "SIMULATED_" + order.getId() + "_" + Instant.now().toEpochMilli();
            tx.setTransactionCode(txCode);

            // JSON giả lập phản hồi từ gateway
            String gatewayResponseJson = """
                    {
                      "simulated": true,
                      "provider": "PAYOS",
                      "message": "Simulated payment success from dev tool",
                      "transactionCode": "%s"
                    }
                    """.formatted(txCode).trim();

            tx.setGatewayResponse(gatewayResponseJson);

            transactionRepository.save(tx);
        }

        // Cập nhật trạng thái order
        order.setPaymentMethod(GATEWAY_CODE_PAYOS);
        order.setStatus(ORDER_STATUS_PAID);
        orderRepository.save(order);

        // TODO: nếu sau này bạn có NotificationService / EmailService
        // thì có thể gọi ở đây, ví dụ:
        // notificationService.notifyOrderPaid(order);
    }
}
