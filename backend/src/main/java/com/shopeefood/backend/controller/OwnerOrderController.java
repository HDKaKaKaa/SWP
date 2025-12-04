package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.OrderDTO;
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
    public Page<OrderDTO> getOrders(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,

            @RequestParam(defaultValue = "createdAt") String sortField,
            @RequestParam(defaultValue = "desc") String sortDir) {
        // Truyền TẤT CẢ tham số, bao gồm sortField và sortDir, vào service
        return orderService.getOrdersForOwner(ownerId, restaurantId, page, size,
                search, from, to, sortField, sortDir);
    }

    // Cập nhật trạng thái đơn hàng (Logic đã được đơn giản hóa)
    @PutMapping("/{orderId}/status")
    public Order updateStatus(
            @PathVariable Integer orderId,
            @RequestParam String status) {
        // 1. Cập nhật trạng thái
        orderService.updateOrderStatus(orderId, status);

        // 2. Lấy đơn hàng mới nhất để trả về cho frontend
        // Giả định orderService đã có hàm getOrderById(Integer orderId)
        return orderService.getOrderById(orderId);
    }
}