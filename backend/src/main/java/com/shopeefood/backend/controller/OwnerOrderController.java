package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/owner/orders")
public class OwnerOrderController {

    @Autowired
    private OrderService orderService;

    // Lấy danh sách đơn hàng cho Owner
    @GetMapping
    public Page<Order> getOrders(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return orderService.getOrdersForOwner(ownerId, restaurantId, page, size, search, from, to);
    }

    // Cập nhật trạng thái đơn hàng
    @PutMapping("/{orderId}/status")
    public Order updateStatus(
            @PathVariable Integer orderId,
            @RequestParam String status
    ) {
        orderService.updateOrderStatus(orderId, status);
        return orderService.getOrdersForOwner(null, null, 0, 1, null, null, null)
                .getContent()
                .stream()
                .filter(o -> o.getId().equals(orderId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Order not found after update"));
    }
}
