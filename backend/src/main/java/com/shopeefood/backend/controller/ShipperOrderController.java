package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shipper/orders")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174" })
public class ShipperOrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ShipperRepository shipperRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    /**
     * Lấy danh sách đơn hàng có sẵn cho shipper
     * Chỉ hiển thị đơn đã được Owner duyệt (status = PREPARING) và chưa có shipper
     * Flow: Customer đặt (PENDING) → Owner duyệt (PREPARING) → Shipper nhận (SHIPPING)
     * GET: http://localhost:8080/api/shipper/orders/available
     */
    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailableOrders() {
        List<Order> orders = orderRepository.findAvailableOrders();

        // Load tất cả Customer một lần để tránh N+1 problem
        List<Integer> customerIds = orders.stream()
                .filter(o -> o.getCustomer() != null)
                .map(o -> o.getCustomer().getId())
                .distinct()
                .collect(Collectors.toList());
        Map<Integer, Customer> customerMap = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getAccountId, c -> c));

        return ResponseEntity.ok(orders.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
            map.put("shippingAddress", order.getShippingAddress());
            map.put("totalAmount", order.getTotalAmount());
            map.put("paymentMethod", order.getPaymentMethod());
            map.put("createdAt", order.getCreatedAt());
            map.put("note", order.getNote());
            
            // Lấy tọa độ customer (địa chỉ giao hàng): ưu tiên từ đơn hàng, nếu không có thì lấy từ Customer
            Double shippingLat = order.getShippingLat();
            Double shippingLong = order.getShippingLong();

            // Nếu đơn hàng chưa có tọa độ, thử lấy từ Customer
            if ((shippingLat == null || shippingLong == null) && order.getCustomer() != null) {
                Customer customer = customerMap.get(order.getCustomer().getId());
                if (customer != null) {
                    if (customer.getLatitude() != null && customer.getLongitude() != null) {
                        shippingLat = customer.getLatitude();
                        shippingLong = customer.getLongitude();

                        // Tự động cập nhật tọa độ vào đơn hàng để lần sau không phải lấy lại
                        order.setShippingLat(shippingLat);
                        order.setShippingLong(shippingLong);
                        orderRepository.save(order);
                    }
                }
            }

            map.put("shippingLat", shippingLat);
            map.put("shippingLong", shippingLong);
            
            // Thêm tọa độ restaurant
            if (order.getRestaurant() != null) {
                map.put("restaurantLat", order.getRestaurant().getLatitude());
                map.put("restaurantLong", order.getRestaurant().getLongitude());
            } else {
                map.put("restaurantLat", null);
                map.put("restaurantLong", null);
            }
            
            return map;
        }).collect(Collectors.toList()));
    }

    /**
     * Lấy danh sách đơn hàng của shipper hiện tại
     * GET: http://localhost:8080/api/shipper/orders/my-orders?shipperId=1
     */
    @GetMapping("/my-orders")
    public ResponseEntity<List<Map<String, Object>>> getMyOrders(@RequestParam Integer shipperId) {
        if (shipperRepository.findById(shipperId).orElse(null) == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Order> orders = orderRepository.findOrdersByShipperId(shipperId);

        // Load tất cả Customer một lần để tránh N+1 problem
        List<Integer> customerIds = orders.stream()
                .filter(o -> o.getCustomer() != null)
                .map(o -> o.getCustomer().getId())
                .distinct()
                .collect(Collectors.toList());
        Map<Integer, Customer> customerMap = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getAccountId, c -> c));

        // Load tất cả Feedback một lần để tránh N+1 problem
        List<Integer> orderIds = orders.stream()
                .map(Order::getId)
                .collect(Collectors.toList());
        List<Feedback> feedbacks = feedbackRepository.findByOrderIdIn(orderIds);
        Map<Integer, Feedback> feedbackMap = feedbacks.stream()
                .collect(Collectors.toMap(f -> f.getOrder().getId(), f -> f));

        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        return ResponseEntity.ok(orders.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
            map.put("shippingAddress", order.getShippingAddress());

            // Lấy tọa độ: ưu tiên từ đơn hàng, nếu không có thì lấy từ Customer
            Double shippingLat = order.getShippingLat();
            Double shippingLong = order.getShippingLong();

            // Nếu đơn hàng chưa có tọa độ, thử lấy từ Customer
            if ((shippingLat == null || shippingLong == null) && order.getCustomer() != null) {
                Customer customer = customerMap.get(order.getCustomer().getId());
                if (customer != null) {
                    if (customer.getLatitude() != null && customer.getLongitude() != null) {
                        shippingLat = customer.getLatitude();
                        shippingLong = customer.getLongitude();

                        // Tự động cập nhật tọa độ vào đơn hàng để lần sau không phải lấy lại
                        order.setShippingLat(shippingLat);
                        order.setShippingLong(shippingLong);
                        orderRepository.save(order);
                    }
                }
            }

            map.put("shippingLat", shippingLat);
            map.put("shippingLong", shippingLong);
            
            // Thêm tọa độ nhà hàng để tính khoảng cách
            if (order.getRestaurant() != null) {
                map.put("restaurantLat", order.getRestaurant().getLatitude());
                map.put("restaurantLong", order.getRestaurant().getLongitude());
            } else {
                map.put("restaurantLat", null);
                map.put("restaurantLong", null);
            }
            
            map.put("totalAmount", order.getTotalAmount());
            map.put("status", order.getStatus());
            map.put("paymentMethod", order.getPaymentMethod());
            map.put("createdAt", order.getCreatedAt());
            map.put("shippedAt", order.getShippedAt()); // Thời gian shipper nhận đơn
            map.put("deliveryStartedAt", order.getDeliveryStartedAt()); // Thời gian bắt đầu giao hàng
            map.put("completedAt", order.getCompletedAt());
            map.put("note", order.getNote());
            map.put("estimatedDeliveryTimeMinutes",
                    order.getEstimatedDeliveryTimeMinutes() != null ? order.getEstimatedDeliveryTimeMinutes() : 2);

            // Tính toán quá hạn
            if (order.getShippedAt() != null) {
                Integer estimatedMinutes = order.getEstimatedDeliveryTimeMinutes() != null
                        ? order.getEstimatedDeliveryTimeMinutes()
                        : 2;
                java.time.LocalDateTime estimatedCompletionTime = order.getShippedAt().plusMinutes(estimatedMinutes);
                boolean isOverdue = false;
                if ("SHIPPING".equals(order.getStatus())) {
                    isOverdue = now.isAfter(estimatedCompletionTime);
                } else if ("COMPLETED".equals(order.getStatus()) && order.getCompletedAt() != null) {
                    isOverdue = order.getCompletedAt().isAfter(estimatedCompletionTime);
                } else if ("CANCELLED".equals(order.getStatus())) {
                    isOverdue = now.isAfter(estimatedCompletionTime);
                }
                map.put("isOverdue", isOverdue);
                map.put("estimatedCompletionTime", estimatedCompletionTime);
            } else {
                map.put("isOverdue", false);
                map.put("estimatedCompletionTime", null);
            }

            // Thông tin khách hàng
            if (order.getCustomer() != null) {
                Customer customer = customerMap.get(order.getCustomer().getId());
                map.put("customerName", customer != null && customer.getFullName() != null
                        ? customer.getFullName()
                        : order.getCustomer().getUsername());
                map.put("customerUsername", order.getCustomer().getUsername());
            } else {
                map.put("customerName", "N/A");
                map.put("customerUsername", "N/A");
            }

            // Thông tin đánh giá từ shipper (nếu có)
            Feedback feedback = feedbackMap.get(order.getId());
            if (feedback != null) {
                map.put("shipperFeedbackRating", feedback.getShipperToCustomerRating());
                map.put("shipperFeedbackComment", feedback.getShipperToCustomerComment());
                map.put("hasShipperFeedback", feedback.getShipperToCustomerRating() != null);
            } else {
                map.put("shipperFeedbackRating", null);
                map.put("shipperFeedbackComment", null);
                map.put("hasShipperFeedback", false);
            }

            // Thêm vị trí shipper hiện tại để tính khoảng cách
            if (order.getShipper() != null) {
                Shipper orderShipper = shipperRepository.findById(order.getShipper().getAccountId()).orElse(null);
                if (orderShipper != null) {
                    // Validate và sửa tọa độ nếu không hợp lệ
                    Double shipperLat = orderShipper.getCurrentLat();
                    Double shipperLong = orderShipper.getCurrentLong();
                    
                    boolean isValidLocation = shipperLat != null && shipperLong != null
                            && shipperLat >= 8.0 && shipperLat <= 23.0
                            && shipperLong >= 102.0 && shipperLong <= 110.0;
                    
                    if (!isValidLocation) {
                        shipperLat = 21.0285; // Hà Nội
                        shipperLong = 105.8542;
                    }
                    
                    map.put("shipperLat", shipperLat);
                    map.put("shipperLong", shipperLong);
                } else {
                    map.put("shipperLat", null);
                    map.put("shipperLong", null);
                }
            } else {
                map.put("shipperLat", null);
                map.put("shipperLong", null);
            }

            return map;
        }).collect(Collectors.toList()));
    }

    /**
     * Shipper nhận đơn hàng
     * Chỉ nhận được đơn đã được Owner duyệt (status = PREPARING)
     * Flow: Customer đặt (PENDING) → Owner duyệt (PREPARING) → Shipper nhận (SHIPPING)
     * POST: http://localhost:8080/api/shipper/orders/{orderId}/accept
     */
    @PostMapping("/{orderId}/accept")
    public ResponseEntity<?> acceptOrder(@PathVariable Integer orderId, @RequestParam Integer shipperId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }

        if (order.getShipper() != null) {
            return ResponseEntity.badRequest().body("Đơn hàng đã được nhận bởi shipper khác");
        }

        if (!order.getStatus().equals("PREPARING")) {
            return ResponseEntity.badRequest()
                    .body("Đơn hàng chưa được Owner duyệt. Chỉ có thể nhận đơn ở trạng thái PREPARING");
        }

        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        if (shipper == null) {
            return ResponseEntity.badRequest().body("Shipper không tồn tại");
        }

        if (!shipper.getStatus().equals("ONLINE")) {
            return ResponseEntity.badRequest().body("Shipper phải ở trạng thái ONLINE để nhận đơn");
        }

        order.setShipper(shipper);
        order.setStatus("SHIPPING");
        // Set thời gian shipper nhận đơn (chưa bắt đầu giao)
        order.setShippedAt(java.time.LocalDateTime.now());
        // deliveryStartedAt sẽ được set khi shipper bắt đầu giao hàng
        orderRepository.save(order);

        // Cập nhật shipper status thành BUSY
        shipper.setStatus("BUSY");
        shipperRepository.save(shipper);

        return ResponseEntity.ok("Nhận đơn hàng thành công!");
    }

    /**
     * Shipper bắt đầu giao hàng (từ nhà hàng đi giao)
     * POST: http://localhost:8080/api/shipper/orders/{orderId}/start-delivery
     */
    @PostMapping("/{orderId}/start-delivery")
    @Transactional
    public ResponseEntity<?> startDelivery(@PathVariable Integer orderId, @RequestParam Integer shipperId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }

        // Kiểm tra shipper có quyền với đơn này không
        if (order.getShipper() == null || !order.getShipper().getAccountId().equals(shipperId)) {
            return ResponseEntity.badRequest().body("Bạn không có quyền với đơn hàng này");
        }

        if (!order.getStatus().equals("SHIPPING")) {
            return ResponseEntity.badRequest().body("Chỉ có thể bắt đầu giao hàng với đơn ở trạng thái SHIPPING");
        }

        // Set thời gian bắt đầu giao hàng
        order.setDeliveryStartedAt(java.time.LocalDateTime.now());
        orderRepository.save(order);

        return ResponseEntity.ok("Đã bắt đầu giao hàng!");
    }

    /**
     * Cập nhật trạng thái đơn hàng
     * PUT: http://localhost:8080/api/shipper/orders/{orderId}/status
     */
    @PutMapping("/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Integer orderId,
            @RequestParam String status) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }

        if (!status.equals("SHIPPING") && !status.equals("COMPLETED") && !status.equals("CANCELLED")) {
            return ResponseEntity.badRequest().body("Trạng thái không hợp lệ");
        }

        // Kiểm tra: Chỉ cho phép hoàn thành đơn hàng nếu đã bắt đầu giao hàng
        if (status.equals("COMPLETED")) {
            if (order.getDeliveryStartedAt() == null) {
                return ResponseEntity.badRequest()
                        .body("Không thể hoàn thành đơn hàng. Vui lòng bắt đầu giao hàng trước!");
            }
            order.setCompletedAt(java.time.LocalDateTime.now());
        }

        order.setStatus(status);

        orderRepository.save(order);

        // Nếu đơn hàng hoàn thành hoặc hủy, cập nhật shipper status về ONLINE
        if (status.equals("COMPLETED") || status.equals("CANCELLED")) {
            if (order.getShipper() != null) {
                Shipper shipper = order.getShipper();
                shipper.setStatus("ONLINE");
                shipperRepository.save(shipper);
            }
        }

        return ResponseEntity.ok("Cập nhật trạng thái đơn hàng thành công!");
    }

    /**
     * Sửa đơn hàng (chỉ cho phép sửa đơn đã COMPLETED hoặc CANCELLED)
     * PUT: http://localhost:8080/api/shipper/orders/{orderId}/edit
     */
    @PutMapping("/{orderId}/edit")
    public ResponseEntity<?> editOrder(
            @PathVariable Integer orderId,
            @RequestParam Integer shipperId,
            @RequestBody Map<String, Object> updates) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }

        // Kiểm tra quyền: chỉ shipper sở hữu đơn mới được sửa
        if (order.getShipper() == null || !order.getShipper().getAccountId().equals(shipperId)) {
            return ResponseEntity.status(403).body("Bạn không có quyền sửa đơn hàng này");
        }

        // Chỉ cho phép sửa đơn đã COMPLETED hoặc CANCELLED
        if (!order.getStatus().equals("COMPLETED") && !order.getStatus().equals("CANCELLED")) {
            return ResponseEntity.badRequest().body("Chỉ có thể sửa đơn hàng đã hoàn thành hoặc đã hủy");
        }

        // Cập nhật các trường có thể sửa
        if (updates.containsKey("note")) {
            order.setNote((String) updates.get("note"));
        }
        if (updates.containsKey("shippingAddress")) {
            order.setShippingAddress((String) updates.get("shippingAddress"));
        }
        if (updates.containsKey("shippingLat")) {
            order.setShippingLat(((Number) updates.get("shippingLat")).doubleValue());
        }
        if (updates.containsKey("shippingLong")) {
            order.setShippingLong(((Number) updates.get("shippingLong")).doubleValue());
        }

        orderRepository.save(order);
        return ResponseEntity.ok("Sửa đơn hàng thành công!");
    }

    /**
     * Xóa đơn hàng (chỉ cho phép xóa đơn đã COMPLETED hoặc CANCELLED)
     * DELETE: http://localhost:8080/api/shipper/orders/{orderId}
     */
    @DeleteMapping("/{orderId}")
    public ResponseEntity<?> deleteOrder(
            @PathVariable Integer orderId,
            @RequestParam Integer shipperId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }

        // Kiểm tra quyền: chỉ shipper sở hữu đơn mới được xóa
        if (order.getShipper() == null || !order.getShipper().getAccountId().equals(shipperId)) {
            return ResponseEntity.status(403).body("Bạn không có quyền xóa đơn hàng này");
        }

        // Chỉ cho phép xóa đơn đã COMPLETED hoặc CANCELLED
        if (!order.getStatus().equals("COMPLETED") && !order.getStatus().equals("CANCELLED")) {
            return ResponseEntity.badRequest().body("Chỉ có thể xóa đơn hàng đã hoàn thành hoặc đã hủy");
        }

        // Xóa đơn hàng (cascade sẽ tự động xóa OrderItem)
        orderRepository.delete(order);

        return ResponseEntity.ok("Xóa đơn hàng thành công!");
    }

    /**
     * Lấy chi tiết đơn hàng (bao gồm orderItems)
     * GET: http://localhost:8080/api/shipper/orders/{orderId}/detail?shipperId=1
     */
    @GetMapping("/{orderId}/detail")
    public ResponseEntity<?> getOrderDetail(
            @PathVariable Integer orderId,
            @RequestParam Integer shipperId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }

        // Kiểm tra quyền: chỉ shipper sở hữu đơn mới được xem
        if (order.getShipper() == null || !order.getShipper().getAccountId().equals(shipperId)) {
            return ResponseEntity.status(403).body("Bạn không có quyền xem đơn hàng này");
        }

        Map<String, Object> result = new HashMap<>();

        // Thông tin đơn hàng
        result.put("id", order.getId());
        result.put("status", order.getStatus());
        result.put("note", order.getNote());
        result.put("paymentMethod", order.getPaymentMethod());
        result.put("shippingAddress", order.getShippingAddress());
        result.put("shippingLat", order.getShippingLat());
        result.put("shippingLong", order.getShippingLong());
        result.put("subtotal", order.getSubtotal());
        result.put("shippingFee", order.getShippingFee());
        result.put("totalAmount", order.getTotalAmount());
        result.put("createdAt", order.getCreatedAt());
        result.put("restaurantAcceptedAt", order.getRestaurantAcceptedAt());
        result.put("shippedAt", order.getShippedAt());
        result.put("completedAt", order.getCompletedAt());
        result.put("estimatedDeliveryTimeMinutes",
                order.getEstimatedDeliveryTimeMinutes() != null ? order.getEstimatedDeliveryTimeMinutes() : 2);

        // Tính toán xem đơn hàng có quá hạn không
        if (order.getShippedAt() != null) {
            Integer estimatedMinutes = order.getEstimatedDeliveryTimeMinutes() != null
                    ? order.getEstimatedDeliveryTimeMinutes()
                    : 2;
            java.time.LocalDateTime estimatedCompletionTime = order.getShippedAt().plusMinutes(estimatedMinutes);

            boolean isOverdue = false;
            if (order.getStatus().equals("SHIPPING")) {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                isOverdue = now.isAfter(estimatedCompletionTime);
            } else if (order.getStatus().equals("COMPLETED") && order.getCompletedAt() != null) {
                isOverdue = order.getCompletedAt().isAfter(estimatedCompletionTime);
            } else if (order.getStatus().equals("CANCELLED")) {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                isOverdue = now.isAfter(estimatedCompletionTime);
            }

            result.put("isOverdue", isOverdue);
            result.put("estimatedCompletionTime", estimatedCompletionTime);
        } else {
            result.put("isOverdue", false);
            result.put("estimatedCompletionTime", null);
        }

        // Thông tin nhà hàng
        if (order.getRestaurant() != null) {
            Map<String, Object> restaurant = new HashMap<>();
            restaurant.put("id", order.getRestaurant().getId());
            restaurant.put("name", order.getRestaurant().getName());
            restaurant.put("address", order.getRestaurant().getAddress());
            restaurant.put("phone", order.getRestaurant().getPhone());
            restaurant.put("lat", order.getRestaurant().getLatitude());
            restaurant.put("long", order.getRestaurant().getLongitude());
            result.put("restaurant", restaurant);
        }

        // Thông tin khách hàng
        if (order.getCustomer() != null) {
            Map<String, Object> customer = new HashMap<>();
            customer.put("id", order.getCustomer().getId());
            customer.put("username", order.getCustomer().getUsername());
            customer.put("email", order.getCustomer().getEmail());
            customer.put("phone", order.getCustomer().getPhone());
            result.put("customer", customer);
        }

        // Chi tiết món ăn (OrderItems)
        if (order.getOrderItems() != null) {
            List<Map<String, Object>> items = order.getOrderItems().stream().map(item -> {
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("price", item.getPrice());
                if (item.getProduct() != null) {
                    Map<String, Object> product = new HashMap<>();
                    product.put("id", item.getProduct().getId());
                    product.put("name", item.getProduct().getName());
                    product.put("image", item.getProduct().getImage());
                    product.put("description", item.getProduct().getDescription());
                    itemMap.put("product", product);
                }
                return itemMap;
            }).collect(Collectors.toList());
            result.put("orderItems", items);
        }

        if (order.getShipper() != null) {
            Map<String, Object> shipperMap = new HashMap<>();
            shipperMap.put("id", order.getShipper().getAccountId());
            shipperMap.put("fullName", order.getShipper().getFullName());

            // Kiểm tra null an toàn cho Account
            String phone = "N/A";
            if (order.getShipper().getAccount() != null) {
                phone = order.getShipper().getAccount().getPhone();
            }
            shipperMap.put("phone", phone);

            shipperMap.put("licensePlate", order.getShipper().getLicensePlate());
            shipperMap.put("vehicleType", order.getShipper().getVehicleType());
            shipperMap.put("avatar", order.getShipper().getAvatar()); // Thêm avatar nếu có

            // Quan trọng: Put shipperId ra ngoài root để frontend check
            result.put("shipperId", order.getShipper().getAccountId());
            result.put("shipper", shipperMap);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Shipper đánh giá đơn hàng (đánh giá customer/trải nghiệm giao hàng)
     * POST: http://localhost:8080/api/shipper/orders/{orderId}/feedback
     */
    @PostMapping("/{orderId}/feedback")
    @Transactional
    public ResponseEntity<?> submitShipperFeedback(
            @PathVariable Integer orderId,
            @RequestParam Integer shipperId,
            @RequestBody Map<String, Object> request) {
        try {
            // Kiểm tra đơn hàng
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
            }

            // Kiểm tra shipper có quyền với đơn này không
            if (order.getShipper() == null || !order.getShipper().getAccountId().equals(shipperId)) {
                return ResponseEntity.badRequest().body("Bạn không có quyền đánh giá đơn hàng này");
            }

            // Chỉ cho phép đánh giá đơn đã hoàn thành
            if (!"COMPLETED".equals(order.getStatus())) {
                return ResponseEntity.badRequest().body("Chỉ có thể đánh giá đơn hàng đã hoàn thành");
            }

            // Kiểm tra đã có feedback chưa - nếu có thì cập nhật, nếu chưa thì tạo mới
            java.util.Optional<Feedback> existingFeedbackOpt = feedbackRepository.findByOrderId(orderId);
            Feedback feedback;

            if (existingFeedbackOpt.isPresent()) {
                // Cập nhật feedback hiện có
                feedback = existingFeedbackOpt.get();
            } else {
                // Tạo feedback mới
                feedback = new Feedback();
                feedback.setCustomer(customerRepository.findById(order.getCustomer().getId()).orElse(null));
                feedback.setRestaurant(order.getRestaurant());
                feedback.setOrder(order);
            }

            // Cập nhật đánh giá từ shipper
            if (request.containsKey("rating")) {
                feedback.setShipperToCustomerRating((Integer) request.get("rating"));
            }
            if (request.containsKey("comment")) {
                feedback.setShipperToCustomerComment((String) request.get("comment"));
            }

            feedbackRepository.save(feedback);

            return ResponseEntity.ok("Đánh giá đơn hàng thành công!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi khi đánh giá: " + e.getMessage());
        }
    }

    /**
     * Lấy đánh giá của shipper cho đơn hàng
     * GET: http://localhost:8080/api/shipper/orders/{orderId}/feedback
     */
    @GetMapping("/{orderId}/feedback")
    public ResponseEntity<?> getShipperFeedback(
            @PathVariable Integer orderId,
            @RequestParam Integer shipperId) {
        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
            }

            // Kiểm tra shipper có quyền với đơn này không
            if (order.getShipper() == null || !order.getShipper().getAccountId().equals(shipperId)) {
                return ResponseEntity.badRequest().body("Bạn không có quyền xem đánh giá đơn hàng này");
            }

            java.util.Optional<Feedback> feedbackOpt = feedbackRepository.findByOrderId(orderId);
            if (feedbackOpt.isEmpty()) {
                Map<String, Object> result = new HashMap<>();
                result.put("hasFeedback", false);
                return ResponseEntity.ok(result);
            }

            Feedback feedback = feedbackOpt.get();
            Map<String, Object> result = new HashMap<>();
            result.put("hasFeedback", true);
            result.put("rating", feedback.getShipperToCustomerRating());
            result.put("comment", feedback.getShipperToCustomerComment());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi khi lấy đánh giá: " + e.getMessage());
        }
    }
}

