package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.service.AdminOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminOrderController {

    @Autowired
    private AdminOrderService orderService;

    // GET: Lấy danh sách (Hỗ trợ filter)
    // VD: /api/admin/orders?status=SHIPPING&startDate=2023-12-01&endDate=2023-12-03
    @GetMapping
    public ResponseEntity<List<OrderDTO>> getOrders(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        // Nếu không truyền ngày, mặc định lấy ngày hôm nay
        if (startDate == null || endDate == null) {
            startDate = LocalDate.now();
            endDate = LocalDate.now();
        }
        List<OrderDTO> orders = orderService.getOrders(status, startDate, endDate);
        return ResponseEntity.ok(orders);
    }

    // PUT: Cập nhật trạng thái
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        try {
            // Payload nhận vào: { "status": "SHIPPING" }
            String newStatus = payload.get("status");
            if (newStatus == null) {
                return ResponseEntity.badRequest().body("Trạng thái không được để trống");
            }
            OrderDTO updatedOrder = orderService.updateOrderStatus(id, newStatus);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}