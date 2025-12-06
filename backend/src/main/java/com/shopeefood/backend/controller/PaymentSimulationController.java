package com.shopeefood.backend.controller;

import com.shopeefood.backend.service.PaymentSimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment/simulate")
public class PaymentSimulationController {

    @Autowired
    private PaymentSimulationService paymentSimulationService;

    /**
     * Giả lập callback thanh toán thành công từ PayOS cho orderId.
     * Dùng trong môi trường DEV/LOCAL để test flow mà không cần gọi PayOS thật.
     */
    @PostMapping("/success/{orderId}")
    public ResponseEntity<?> simulateSuccess(@PathVariable Integer orderId) {
        paymentSimulationService.simulatePaymentSuccess(orderId);
        return ResponseEntity.ok(
                Map.of(
                        "orderId", orderId,
                        "message", "SIMULATED_PAYMENT_SUCCESS"
                )
        );
    }
}
