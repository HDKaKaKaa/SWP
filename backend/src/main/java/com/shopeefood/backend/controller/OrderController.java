package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.OrderRequest;
import com.shopeefood.backend.dto.OrderItemRequest;
import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Propagation;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
    @Autowired
    private FeedbackRepository feedbackRepository;
    @Autowired
    private CustomerRepository customerRepository;

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

    /**
     * Lấy danh sách đơn hàng của khách hàng
     * GET: http://localhost:8080/api/orders/customer/{customerId}
     */
    @GetMapping("/customer/{customerId}")
    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS)
    public ResponseEntity<?> getCustomerOrders(@PathVariable Integer customerId) {
        try {
            // Sử dụng method đơn giản hơn để tránh lỗi với DISTINCT và JOIN FETCH
            List<Order> orders = orderRepository.findByCustomerIdAndStatusNotIn(
                    customerId,
                    List.of("CART", "CART_DELETED")
            );

            // Load các quan hệ cần thiết trong transaction
            for (Order order : orders) {
                // Force load orderItems và product
                if (order.getOrderItems() != null) {
                    order.getOrderItems().size(); // Force load
                    for (var item : order.getOrderItems()) {
                        if (item.getProduct() != null) {
                            item.getProduct().getName(); // Force load product
                        }
                    }
                }
                // Force load restaurant
                if (order.getRestaurant() != null) {
                    order.getRestaurant().getName();
                }
                // Force load shipper
                if (order.getShipper() != null) {
                    order.getShipper().getFullName();
                }
            }

        List<Map<String, Object>> result = orders.stream()
                .sorted((o1, o2) -> {
                    // Sắp xếp theo thời gian tạo mới nhất lên đầu
                    if (o1.getCreatedAt() == null && o2.getCreatedAt() == null) return 0;
                    if (o1.getCreatedAt() == null) return 1;
                    if (o2.getCreatedAt() == null) return -1;
                    return o2.getCreatedAt().compareTo(o1.getCreatedAt());
                })
                .map(order -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", order.getId());
                    map.put("orderNumber", order.getOrderNumber());

                    // Chi tiết đơn hàng (danh sách món)
                    List<Map<String, Object>> orderItems = order.getOrderItems() != null
                            ? order.getOrderItems().stream().map(item -> {
                                Map<String, Object> itemMap = new java.util.HashMap<>();
                                itemMap.put("productName", item.getProduct() != null ? item.getProduct().getName() : "N/A");
                                itemMap.put("quantity", item.getQuantity());
                                itemMap.put("price", item.getPrice());
                                return itemMap;
                            }).collect(java.util.stream.Collectors.toList())
                            : java.util.Collections.emptyList();
                    map.put("orderItems", orderItems);

                    // Tổng thanh toán
                    map.put("totalAmount", order.getTotalAmount());

                    // Tên quán
                    map.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");

                    // Tên shipper
                    map.put("shipperName", order.getShipper() != null ? order.getShipper().getFullName() : "Chưa có");

                    // THÊM: shipperId để frontend khiếu nại shipper
                    map.put("shipperId", order.getShipper() != null ? order.getShipper().getAccountId() : null);

                    // THÊM: restaurantId để frontend khiếu nại quán (optional nhưng nên có)
                    map.put("restaurantId", order.getRestaurant() != null ? order.getRestaurant().getId() : null);

                    // Thời gian giao (completedAt hoặc shippedAt)
                    if (order.getCompletedAt() != null) {
                        map.put("deliveryTime", order.getCompletedAt());
                    } else if (order.getShippedAt() != null) {
                        map.put("deliveryTime", order.getShippedAt());
                    } else {
                        map.put("deliveryTime", null);
                    }

                    // Status
                    map.put("status", order.getStatus());
                    map.put("createdAt", order.getCreatedAt());

                    // Lấy thông tin feedback nếu có
                    try {
                        Optional<Feedback> feedbackOpt = feedbackRepository.findByOrderId(order.getId());
                        if (feedbackOpt.isPresent()) {
                            Feedback feedback = feedbackOpt.get();
                            map.put("hasFeedback", true);
                            map.put("feedbackRating", feedback.getRating());
                            map.put("feedbackComment", feedback.getComment());
                            map.put("shipperRating", feedback.getShipperRating());
                            map.put("shipperComment", feedback.getShipperComment());
                        } else {
                            map.put("hasFeedback", false);
                            map.put("feedbackRating", null);
                            map.put("feedbackComment", null);
                            map.put("shipperRating", null);
                            map.put("shipperComment", null);
                        }
                    } catch (Exception e) {
                        // Nếu có lỗi khi lấy feedback, set mặc định là chưa có
                        map.put("hasFeedback", false);
                        map.put("feedbackRating", null);
                        map.put("feedbackComment", null);
                        map.put("shipperRating", null);
                        map.put("shipperComment", null);
                    }

                    return map;
                })
                .collect(java.util.stream.Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Lỗi khi lấy danh sách đơn hàng: " + e.getMessage());
        }
    }

    /**
     * Tạo feedback cho đơn hàng
     * POST: http://localhost:8080/api/orders/{orderId}/feedback
     */
    @PostMapping("/{orderId}/feedback")
    @Transactional
    public ResponseEntity<?> createFeedback(
            @PathVariable Integer orderId,
            @RequestBody Map<String, Object> request) {
        
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }
        
        // Kiểm tra đơn hàng đã hoàn thành chưa
        if (!order.getStatus().equals("COMPLETED")) {
            return ResponseEntity.badRequest().body("Chỉ có thể đánh giá đơn hàng đã hoàn thành");
        }
        
        // Lấy customer từ order (nếu chưa có thì tạo mới)
        Customer customer = customerRepository.findById(order.getCustomer().getId())
                .orElseGet(() -> {
                    Customer newCustomer = new Customer();
                    newCustomer.setAccountId(order.getCustomer().getId());
                    return customerRepository.save(newCustomer);
                });
        
        // Kiểm tra đã có feedback chưa - nếu có thì cập nhật, nếu chưa thì tạo mới
        Optional<Feedback> existingFeedbackOpt = feedbackRepository.findByOrderId(orderId);
        Feedback feedback;
        
        if (existingFeedbackOpt.isPresent()) {
            // Cập nhật feedback hiện có
            feedback = existingFeedbackOpt.get();
            feedback.setRating((Integer) request.get("rating"));
            feedback.setComment((String) request.get("comment"));
            feedback.setShipperRating((Integer) request.get("shipperRating"));
            feedback.setShipperComment((String) request.get("shipperComment"));
        } else {
            // Tạo feedback mới
            feedback = new Feedback();
            feedback.setCustomer(customer);
            feedback.setRestaurant(order.getRestaurant());
            feedback.setOrder(order);
            feedback.setRating((Integer) request.get("rating"));
            feedback.setComment((String) request.get("comment"));
            feedback.setShipperRating((Integer) request.get("shipperRating"));
            feedback.setShipperComment((String) request.get("shipperComment"));
        }
        
        feedbackRepository.save(feedback);
        
        return ResponseEntity.ok("Đánh giá thành công!");
    }
}