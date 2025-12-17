package com.shopeefood.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.shopeefood.backend.dto.PaymentLinkDTO;
import com.shopeefood.backend.payment.vnpay.VnpayService;
import com.shopeefood.backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final VnpayService vnpayService;

    @PostMapping("/create-link/{orderId}")
    public ResponseEntity<?> createPaymentLink(@PathVariable Integer orderId) {
        try {
            PaymentLinkDTO dto = paymentService.createPaymentLink(orderId);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(@RequestBody JsonNode body) {
        try {
            paymentService.processPayOSWebhook(body);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return ResponseEntity.ok("success");
    }

    @PostMapping("/confirm-success")
    public ResponseEntity<?> confirmSuccess(@RequestParam("orderId") Integer orderId) {
        paymentService.markPaidFromClient(orderId);
        return ResponseEntity.ok().build();
    }

    // =============================
    // VNPay (Sandbox) - DEV MODE
    // /checkout -> VNPay sandbox -> /order-success
    // =============================
    @PostMapping("/vnpay/create-url/{orderId}")
    public ResponseEntity<?> createVnpayUrl(@PathVariable Integer orderId, HttpServletRequest request) {
        try {
            String ip = request.getRemoteAddr();
            String paymentUrl = vnpayService.createPaymentUrl(orderId, ip);
            return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * FE calls this on /order-success with the VNPay query params.
     * Backend verifies signature then updates order + transaction.
     */
    @PostMapping("/vnpay/confirm-return")
    public ResponseEntity<?> confirmVnpayReturn(@RequestParam Map<String, String> params) {
        try {
            return ResponseEntity.ok(vnpayService.confirmReturn(params));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}
