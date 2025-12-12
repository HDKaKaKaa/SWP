package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shipper")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class ShipperController {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private ShipperRepository shipperRepository;
    
    @Autowired
    private AccountRepository accountRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Autowired
    private CustomerRepository customerRepository;

    /**
     * Lấy danh sách đơn hàng chưa có shipper (PAID)
     * GET: http://localhost:8080/api/shipper/orders/available
     */
    @GetMapping("/orders/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailableOrders() {
        List<Order> orders = orderRepository.findAvailableOrders();
        
        return ResponseEntity.ok(orders.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
            map.put("shippingAddress", order.getShippingAddress());
            map.put("totalAmount", order.getTotalAmount());
            map.put("paymentMethod", order.getPaymentMethod());
            map.put("createdAt", order.getCreatedAt());
            map.put("note", order.getNote());
            return map;
        }).collect(Collectors.toList()));
    }

    /**
     * Lấy danh sách đơn hàng của shipper hiện tại
     * GET: http://localhost:8080/api/shipper/orders/my-orders?shipperId=1
     */
    @GetMapping("/orders/my-orders")
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
        
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        
        return ResponseEntity.ok(orders.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
            map.put("shippingAddress", order.getShippingAddress());
            map.put("shippingLat", order.getShippingLat());
            map.put("shippingLong", order.getShippingLong());
            map.put("totalAmount", order.getTotalAmount());
            map.put("status", order.getStatus());
            map.put("paymentMethod", order.getPaymentMethod());
            map.put("createdAt", order.getCreatedAt());
            map.put("shippedAt", order.getShippedAt());
            map.put("completedAt", order.getCompletedAt());
            map.put("note", order.getNote());
            map.put("estimatedDeliveryTimeMinutes", order.getEstimatedDeliveryTimeMinutes() != null ? order.getEstimatedDeliveryTimeMinutes() : 2);
            
            // Tính toán quá hạn
            if (order.getShippedAt() != null) {
                Integer estimatedMinutes = order.getEstimatedDeliveryTimeMinutes() != null ? order.getEstimatedDeliveryTimeMinutes() : 2;
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
            return map;
        }).collect(Collectors.toList()));
    }

    /**
     * Shipper nhận đơn hàng
     * POST: http://localhost:8080/api/shipper/orders/{orderId}/accept
     */
    @PostMapping("/orders/{orderId}/accept")
    public ResponseEntity<?> acceptOrder(@PathVariable Integer orderId, @RequestParam Integer shipperId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại");
        }
        
        if (order.getShipper() != null) {
            return ResponseEntity.badRequest().body("Đơn hàng đã được nhận bởi shipper khác");
        }
        
        if (!order.getStatus().equals("PAID")) {
            return ResponseEntity.badRequest().body("Đơn hàng không ở trạng thái PAID");
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
        // Set thời gian bắt đầu giao hàng
        order.setShippedAt(java.time.LocalDateTime.now());
        orderRepository.save(order);
        
        // Cập nhật shipper status thành BUSY
        shipper.setStatus("BUSY");
        shipperRepository.save(shipper);
        
        return ResponseEntity.ok("Nhận đơn hàng thành công!");
    }

    /**
     * Cập nhật trạng thái đơn hàng
     * PUT: http://localhost:8080/api/shipper/orders/{orderId}/status
     */
    @PutMapping("/orders/{orderId}/status")
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
        
        order.setStatus(status);
        
        // Nếu hoàn thành, set thời gian hoàn thành
        if (status.equals("COMPLETED")) {
            order.setCompletedAt(java.time.LocalDateTime.now());
        }
        
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
     * Lấy thông tin shipper
     * GET: http://localhost:8080/api/shipper/profile?shipperId=1
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestParam Integer shipperId) {
        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        if (shipper == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("accountId", shipper.getAccountId());
        result.put("fullName", shipper.getFullName());
        result.put("licensePlate", shipper.getLicensePlate());
        result.put("vehicleType", shipper.getVehicleType());
        result.put("currentLat", shipper.getCurrentLat());
        result.put("currentLong", shipper.getCurrentLong());
        result.put("status", shipper.getStatus());
        if (shipper.getAccount() != null) {
            result.put("email", shipper.getAccount().getEmail());
            result.put("phone", shipper.getAccount().getPhone());
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * Cập nhật thông tin shipper
     * PUT: http://localhost:8080/api/shipper/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestParam Integer shipperId,
            @RequestBody Map<String, Object> updates) {
        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        if (shipper == null) {
            return ResponseEntity.badRequest().body("Shipper không tồn tại");
        }
        
        if (updates.containsKey("fullName")) {
            shipper.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("licensePlate")) {
            shipper.setLicensePlate((String) updates.get("licensePlate"));
        }
        if (updates.containsKey("vehicleType")) {
            shipper.setVehicleType((String) updates.get("vehicleType"));
        }
        if (updates.containsKey("currentLat")) {
            shipper.setCurrentLat(((Number) updates.get("currentLat")).doubleValue());
        }
        if (updates.containsKey("currentLong")) {
            shipper.setCurrentLong(((Number) updates.get("currentLong")).doubleValue());
        }
        
        shipperRepository.save(shipper);
        return ResponseEntity.ok("Cập nhật thông tin thành công!");
    }

    /**
     * Cập nhật trạng thái shipper (ONLINE/OFFLINE/BUSY)
     * PUT: http://localhost:8080/api/shipper/status
     */
    @PutMapping("/status")
    @Transactional
    public ResponseEntity<?> updateStatus(
            @RequestParam Integer shipperId,
            @RequestParam String status) {
        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        
        // Nếu chưa có Shipper, tự động tạo mới
        if (shipper == null) {
            // Kiểm tra xem account có tồn tại và có role SHIPPER không
            Account account = accountRepository.findById(shipperId).orElse(null);
            if (account == null) {
                return ResponseEntity.badRequest().body("Tài khoản không tồn tại");
            }
            if (!"SHIPPER".equals(account.getRole())) {
                return ResponseEntity.badRequest().body("Tài khoản này không phải là Shipper");
            }
            
            // Đảm bảo account có ID
            if (account.getId() == null) {
                return ResponseEntity.badRequest().body("Tài khoản không hợp lệ");
            }
            
            // Kiểm tra trạng thái hợp lệ
            if (!status.equals("ONLINE") && !status.equals("OFFLINE") && !status.equals("BUSY")) {
                return ResponseEntity.badRequest().body("Trạng thái không hợp lệ");
            }
            
            // Tạo Shipper mới
            shipper = new Shipper();
            // Với @MapsId, chỉ cần set account object, Hibernate sẽ tự động lấy account.getId() làm accountId
            shipper.setAccount(account);
            shipper.setFullName(account.getUsername()); // Dùng username làm tên mặc định
            shipper.setStatus(status); // Set status từ request
            
            // Dùng persist cho entity mới thay vì save (save sẽ merge và gây lỗi với @MapsId)
            entityManager.persist(shipper);
            entityManager.flush(); // Đảm bảo persist được thực thi ngay
            
            return ResponseEntity.ok("Cập nhật trạng thái thành công!");
        }
        
        // Nếu đã có shipper, chỉ cập nhật status
        if (!status.equals("ONLINE") && !status.equals("OFFLINE") && !status.equals("BUSY")) {
            return ResponseEntity.badRequest().body("Trạng thái không hợp lệ");
        }
        
        // Đảm bảo account được load đúng cách (tránh lỗi null identifier với @MapsId)
        if (shipper.getAccount() == null) {
            Account account = accountRepository.findById(shipperId).orElse(null);
            if (account == null) {
                return ResponseEntity.badRequest().body("Tài khoản không tồn tại");
            }
            shipper.setAccount(account);
        }
        
        shipper.setStatus(status);
        // Dùng merge để đảm bảo entity được quản lý đúng cách
        entityManager.merge(shipper);
        entityManager.flush();
        
        return ResponseEntity.ok("Cập nhật trạng thái thành công!");
    }

    /**
     * Sửa đơn hàng (chỉ cho phép sửa đơn đã COMPLETED hoặc CANCELLED)
     * PUT: http://localhost:8080/api/shipper/orders/{orderId}/edit
     */
    @PutMapping("/orders/{orderId}/edit")
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
    @DeleteMapping("/orders/{orderId}")
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
    @GetMapping("/orders/{orderId}/detail")
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
        result.put("estimatedDeliveryTimeMinutes", order.getEstimatedDeliveryTimeMinutes() != null ? order.getEstimatedDeliveryTimeMinutes() : 2);
        
        // Tính toán xem đơn hàng có quá hạn không
        if (order.getShippedAt() != null) {
            Integer estimatedMinutes = order.getEstimatedDeliveryTimeMinutes() != null ? order.getEstimatedDeliveryTimeMinutes() : 2;
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
            // Note: Restaurant entity không có lat/long fields
            // Nếu cần, có thể thêm vào database và entity sau
            restaurant.put("lat", null);
            restaurant.put("long", null);
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
        
        return ResponseEntity.ok(result);
    }
}



