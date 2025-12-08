package com.shopeefood.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.shopeefood.backend.dto.PaymentLinkDTO;
import com.shopeefood.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

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

}
