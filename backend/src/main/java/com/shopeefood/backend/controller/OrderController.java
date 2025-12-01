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
import java.util.Date;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5173")
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
        order.setCreatedAt(new Date()); // Nếu entity chưa tự động set

        Order savedOrder = orderRepository.save(order);

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
}