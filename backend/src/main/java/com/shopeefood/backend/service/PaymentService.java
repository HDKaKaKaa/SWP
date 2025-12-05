package com.shopeefood.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.shopeefood.backend.dto.PaymentLinkDTO;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Transaction;
import com.shopeefood.backend.repository.OrderRepository;
import com.shopeefood.backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.type.Webhook;
import vn.payos.type.WebhookData;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final PayOS payOS;

    @Value("${payos.client-id}")
    private String clientId;

    @Value("${payos.api-key}")
    private String apiKey;

    @Value("${payos.checksum-key}")
    private String checksumKey;

    @Value("${payos.return-url}")
    private String returnUrl;

    @Value("${payos.cancel-url}")
    private String cancelUrl;

    // =============================
    //  1. Tạo Link Thanh Toán PayOS
    // =============================

    @Transactional
    public PaymentLinkDTO createPaymentLink(Integer orderId) throws Exception {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        BigDecimal totalAmount = order.getTotalAmount();
        int amount = totalAmount.intValue();

        // Tạo orderCode
        String nano = String.valueOf(System.nanoTime());
        String orderCodeStr = order.getId() + nano.substring(nano.length() - 6);
        long orderCode = Long.parseLong(orderCodeStr);

        // Nội dung ck
        String description = order.getOrderNumber(); // FOyyyyMMddNNNN
        if (description == null || description.isBlank()) {
            description = "FO" + order.getId();
        }
        description = description.toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (description.length() > 25) description = description.substring(0, 25);

        // Tạo signature
        String stringToSign =
                "amount=" + amount +
                "&cancelUrl=" + cancelUrl +
                "&description=" + description +
                "&orderCode=" + orderCode +
                "&returnUrl=" + returnUrl;

        String signature = createHmacSha256(stringToSign, checksumKey);

        // Gửi API
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode body = mapper.createObjectNode();
        body.put("orderCode", orderCode);
        body.put("amount", amount);
        body.put("description", description);
        body.put("cancelUrl", cancelUrl);
        body.put("returnUrl", returnUrl);
        body.put("signature", signature);

        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api-merchant.payos.vn/v2/payment-requests"))
                .header("Content-Type", "application/json")
                .header("x-client-id", clientId)
                .header("x-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        HttpResponse<String> response =
                client.send(request, HttpResponse.BodyHandlers.ofString());

        JsonNode resNode = mapper.readTree(response.body());

        if (!"00".equals(resNode.get("code").asText())) {
            throw new RuntimeException("PayOS error: " + resNode.path("desc").asText());
        }

        JsonNode data = resNode.get("data");

        // Lưu Transaction
        Transaction transaction = new Transaction();
        transaction.setOrder(order);
        transaction.setAmount(totalAmount);
        transaction.setTransactionCode(String.valueOf(orderCode));
        transaction.setStatus("PENDING");
        transaction.setGatewayResponse(null);
        transactionRepository.save(transaction);

        // Cập nhật Order
        order.setPaymentMethod("PAYOS");
        orderRepository.save(order);

        return new PaymentLinkDTO(
                data.path("bin").asText(),
                data.path("accountNumber").asText(),
                data.path("accountName").asText(),
                data.path("amount").asLong(),
                data.path("description").asText(),
                data.path("orderCode").asLong(),
                data.path("qrCode").asText(),
                data.path("checkoutUrl").asText()
        );
    }

    // =============================
    //  2. Xử lý Webhook PayOS
    // =============================
    @Transactional
    public void processPayOSWebhook(JsonNode webhookBody) throws Exception {

        ObjectMapper mapper = new ObjectMapper();
        Webhook webhook = mapper.treeToValue(webhookBody, Webhook.class);
        WebhookData data = payOS.verifyPaymentWebhookData(webhook);

        long orderCode = data.getOrderCode();
        long paidAmount = data.getAmount();

        String orderCodeStr = String.valueOf(orderCode);

        Integer orderId = Integer.parseInt(orderCodeStr.substring(0, orderCodeStr.length() - 6));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getTotalAmount().intValue() != paidAmount) {
            System.err.println("Amount mismatch!");
            return;
        }

        // Cập nhật giao dịch
        Optional<Transaction> opt =
                transactionRepository.findByTransactionCode(orderCodeStr);

        Transaction transaction = opt.orElse(new Transaction());

        transaction.setOrder(order);
        transaction.setAmount(order.getTotalAmount());
        transaction.setTransactionCode(orderCodeStr);
        transaction.setStatus("SUCCESS");
        transaction.setGatewayResponse(webhookBody.toString());

        transactionRepository.save(transaction);

        // Update order
        order.setPaymentMethod("PAYOS");
        order.setStatus("PAID");
        orderRepository.save(order);
    }

    // =============================
    //  HMAC SHA256
    // =============================
    private String createHmacSha256(String data, String key) {
        try {
            Mac sha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret =
                    new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256.init(secret);

            byte[] bytes = sha256.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();

        } catch (Exception e) {
            throw new RuntimeException("Error generating HMAC", e);
        }
    }
}
