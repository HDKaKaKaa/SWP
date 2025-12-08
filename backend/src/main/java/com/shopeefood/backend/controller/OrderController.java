package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.OrderRequest;
import com.shopeefood.backend.dto.OrderItemRequest;
import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderItemRepository orderItemRepository;
    @Autowired
    private ProductRepository productRepository;

    // Tạo 3 Repository giả để findById (Vì bạn đã tạo ở các bước trước rồi)
    // Nếu chưa có, Spring sẽ báo lỗi, bạn cần @Autowired AccountRepository,
    // RestaurantRepository vào nhé.

    @PostMapping("/create")
    @Transactional // Nếu lưu món lỗi -> Hủy cả đơn hàng (Rollback)
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest request) {

        // 1. Tính tổng tiền
        double totalAmount = 0;
        for (OrderItemRequest item : request.getItems()) {
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p != null) {
                totalAmount += p.getPrice() * item.getQuantity();
            }
        }

        // 2. Lưu Đơn hàng (Order)
        Order order = new Order();
        // Set ID cho User và Restaurant (Làm tắt: chỉ set ID để Hibernate tự hiểu)
        Account user = new Account();
        user.setId(request.getAccountId());
        order.setCustomer(user); // Vì trong Entity Order bạn đặt tên là customer

        Restaurant res = new Restaurant();
        res.setId(request.getRestaurantId());
        order.setRestaurant(res);

        order.setShippingAddress(request.getAddress());
        order.setSubtotal(BigDecimal.valueOf(totalAmount));
        order.setShippingFee(BigDecimal.valueOf(15000)); // Phí ship cứng
        order.setTotalAmount(BigDecimal.valueOf(totalAmount + 15000));
        order.setStatus("PENDING");
        order.setCreatedAt(LocalDateTime.now()); // Nếu entity chưa tự động set

        Order savedOrder = orderRepository.save(order);

        // Gán mã đơn nếu chưa có
        if (savedOrder.getOrderNumber() == null) {
            savedOrder.setOrderNumber(Order.buildOrderNumber(savedOrder.getId()));
            savedOrder = orderRepository.save(savedOrder);
        }

        // 3. Lưu chi tiết món (Order Items)
        for (OrderItemRequest itemReq : request.getItems()) {
            Product p = productRepository.findById(itemReq.getProductId()).orElseThrow();

            OrderItem item = new OrderItem();
            item.setOrder(savedOrder);
            item.setProduct(p);
            item.setQuantity(itemReq.getQuantity());
            item.setPrice(BigDecimal.valueOf(p.getPrice()));

            orderItemRepository.save(item);
        }

        return ResponseEntity.ok("Đặt hàng thành công! Mã đơn: " + savedOrder.getId());
    }

    /**
     * Lấy danh sách đơn hàng quá hạn cho nhà hàng
     * GET: http://localhost:8080/api/orders/overdue?restaurantId=1
     */
    @GetMapping("/overdue")
    public ResponseEntity<?> getOverdueOrders(@RequestParam(required = false) Integer restaurantId) {
        List<Order> allOrders = orderRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        
        List<Map<String, Object>> overdueOrders = allOrders.stream()
                .filter(order -> {
                    // Chỉ lấy đơn đang giao (SHIPPING)
                    if (!order.getStatus().equals("SHIPPING") || order.getShippedAt() == null) {
                        return false;
                    }
                    
                    // Lọc theo restaurant nếu có
                    if (restaurantId != null && order.getRestaurant() != null) {
                        if (!order.getRestaurant().getId().equals(restaurantId)) {
                            return false;
                        }
                    }
                    
                    // Kiểm tra quá hạn
                    Integer estimatedMinutes = order.getEstimatedDeliveryTimeMinutes() != null 
                            ? order.getEstimatedDeliveryTimeMinutes() 
                            : 2;
                    LocalDateTime estimatedCompletionTime = order.getShippedAt().plusMinutes(estimatedMinutes);
                    return now.isAfter(estimatedCompletionTime);
                })
                .map(order -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", order.getId());
                    map.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
                    map.put("shippingAddress", order.getShippingAddress());
                    map.put("totalAmount", order.getTotalAmount());
                    map.put("status", order.getStatus());
                    map.put("shippedAt", order.getShippedAt());
                    map.put("estimatedDeliveryTimeMinutes", order.getEstimatedDeliveryTimeMinutes() != null 
                            ? order.getEstimatedDeliveryTimeMinutes() 
                            : 2);
                    if (order.getShipper() != null) {
                        map.put("shipperName", order.getShipper().getFullName());
                        map.put("shipperId", order.getShipper().getAccountId());
                    }
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(overdueOrders);
    }
}