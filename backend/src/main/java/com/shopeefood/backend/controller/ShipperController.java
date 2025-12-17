package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import com.shopeefood.backend.service.CloudinaryService;
import com.shopeefood.backend.dto.ChangePasswordRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shipper")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174" })
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

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private FeedbackRepository feedbackRepository;

    /**
     * Lấy danh sách đơn hàng có sẵn cho shipper
     * Chỉ hiển thị đơn đã được Owner duyệt (status = PREPARING) và chưa có shipper
     * Flow: Customer đặt (PENDING) → Owner duyệt (PREPARING) → Shipper nhận
     * (SHIPPING)
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

            return map;
        }).collect(Collectors.toList()));
    }

    /**
     * Shipper nhận đơn hàng
     * Chỉ nhận được đơn đã được Owner duyệt (status = PREPARING)
     * Flow: Customer đặt (PENDING) → Owner duyệt (PREPARING) → Shipper nhận
     * (SHIPPING)
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
    @PostMapping("/orders/{orderId}/start-delivery")
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
        result.put("avatar", shipper.getAvatar());
        result.put("licenseImage", shipper.getLicenseImage());
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
    @Transactional
    public ResponseEntity<?> updateProfile(
            @RequestParam Integer shipperId,
            @RequestBody Map<String, Object> updates) {
        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        if (shipper == null) {
            return ResponseEntity.badRequest().body("Shipper không tồn tại");
        }

        // Cập nhật thông tin Shipper
        if (updates.containsKey("fullName")) {
            shipper.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("licensePlate")) {
            shipper.setLicensePlate((String) updates.get("licensePlate"));
        }
        if (updates.containsKey("vehicleType")) {
            shipper.setVehicleType((String) updates.get("vehicleType"));
        }
        if (updates.containsKey("avatar")) {
            shipper.setAvatar((String) updates.get("avatar"));
        }
        if (updates.containsKey("currentLat")) {
            shipper.setCurrentLat(((Number) updates.get("currentLat")).doubleValue());
        }
        if (updates.containsKey("currentLong")) {
            shipper.setCurrentLong(((Number) updates.get("currentLong")).doubleValue());
        }

        // Cập nhật thông tin Account (email, phone)
        Account account = shipper.getAccount();
        if (account != null) {
            // Kiểm tra email không trùng với tài khoản khác
            if (updates.containsKey("email")) {
                String newEmail = (String) updates.get("email");
                if (newEmail != null && !newEmail.isEmpty()) {
                    java.util.Optional<Account> existingAccount = accountRepository.findByEmail(newEmail);
                    if (existingAccount.isPresent() && !existingAccount.get().getId().equals(shipperId)) {
                        return ResponseEntity.badRequest().body("Email đã được sử dụng bởi tài khoản khác");
                    }
                    account.setEmail(newEmail);
                }
            }

            // Cập nhật số điện thoại
            if (updates.containsKey("phone")) {
                account.setPhone((String) updates.get("phone"));
            }

            accountRepository.save(account);
        }

        shipperRepository.save(shipper);
        return ResponseEntity.ok("Cập nhật thông tin thành công!");
    }

    /**
     * Upload ảnh đại diện cho shipper
     * POST: http://localhost:8080/api/shipper/profile/avatar
     */
    @PostMapping("/profile/avatar")
    @Transactional
    public ResponseEntity<?> uploadAvatar(
            @RequestParam Integer shipperId,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Vui lòng chọn ảnh!");
            }

            Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
            if (shipper == null) {
                return ResponseEntity.badRequest().body("Shipper không tồn tại");
            }

            // Upload ảnh lên Cloudinary
            String imageUrl = cloudinaryService.uploadImage(file);

            // Lưu URL ảnh vào database
            shipper.setAvatar(imageUrl);
            shipperRepository.save(shipper);

            Map<String, Object> result = new HashMap<>();
            result.put("message", "Upload ảnh thành công!");
            result.put("avatar", imageUrl);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi khi upload ảnh: " + e.getMessage());
        }
    }

    /**
     * Upload ảnh giấy phép lái xe cho shipper
     * POST: http://localhost:8080/api/shipper/profile/license-image
     */
    @PostMapping("/profile/license-image")
    @Transactional
    public ResponseEntity<?> uploadLicenseImage(
            @RequestParam Integer shipperId,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Vui lòng chọn ảnh!");
            }

            Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
            if (shipper == null) {
                return ResponseEntity.badRequest().body("Shipper không tồn tại");
            }

            // Upload ảnh lên Cloudinary
            String imageUrl = cloudinaryService.uploadImage(file);

            // Lưu URL ảnh vào database
            shipper.setLicenseImage(imageUrl);
            shipperRepository.save(shipper);

            Map<String, Object> result = new HashMap<>();
            result.put("message", "Upload ảnh giấy phép lái xe thành công!");
            result.put("licenseImage", imageUrl);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi khi upload ảnh: " + e.getMessage());
        }
    }

    /**
     * Đổi mật khẩu cho shipper
     * PUT: http://localhost:8080/api/shipper/change-password
     */
    @PutMapping("/change-password")
    @Transactional
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        try {
            // Kiểm tra dữ liệu
            if (request.getAccountId() == null) {
                return ResponseEntity.badRequest().body("Thiếu ID tài khoản!");
            }
            if (request.getOldPassword() == null || request.getOldPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("Chưa nhập mật khẩu cũ!");
            }
            if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("Chưa nhập mật khẩu mới!");
            }
            if (!request.getNewPassword().equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest().body("Mật khẩu xác nhận không khớp!");
            }

            // Tìm Account
            Account account = accountRepository.findById(request.getAccountId())
                    .orElse(null);
            if (account == null) {
                return ResponseEntity.badRequest().body("Tài khoản không tồn tại!");
            }

            // Kiểm tra mật khẩu cũ
            if (!passwordEncoder.matches(request.getOldPassword(), account.getPassword())) {
                return ResponseEntity.badRequest().body("Mật khẩu cũ không chính xác!");
            }

            // Lưu mật khẩu mới
            account.setPassword(passwordEncoder.encode(request.getNewPassword()));
            accountRepository.save(account);

            return ResponseEntity.ok("Đổi mật khẩu thành công!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi hệ thống: " + e.getMessage());
        }
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
            // Với @MapsId, chỉ cần set account object, Hibernate sẽ tự động lấy
            // account.getId() làm accountId
            shipper.setAccount(account);
            shipper.setFullName(account.getUsername()); // Dùng username làm tên mặc định
            shipper.setStatus(status); // Set status từ request

            // Dùng persist cho entity mới thay vì save (save sẽ merge và gây lỗi với
            // @MapsId)
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

    @GetMapping("/public/{id}")
    public ResponseEntity<?> getShipperPublicInfo(@PathVariable Integer id) {
        try {
            // 1. Kiểm tra xem Shipper có tồn tại không
            var shipperOpt = shipperRepository.findById(id);
            if (shipperOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Shipper shipper = shipperOpt.get();

            // 2. Tạo Map để trả về dữ liệu (Tránh trả về Entity trực tiếp gây lỗi)
            Map<String, Object> response = new HashMap<>();
            response.put("id", shipper.getAccountId());
            response.put("fullName", shipper.getFullName());
            response.put("licensePlate", shipper.getLicensePlate());
            response.put("vehicleType", shipper.getVehicleType());
            response.put("currentLat", shipper.getCurrentLat());
            response.put("currentLong", shipper.getCurrentLong());
            response.put("avatar", shipper.getAvatar());

            // Lấy SĐT an toàn từ Account
            if (shipper.getAccount() != null) {
                response.put("phone", shipper.getAccount().getPhone());
            } else {
                response.put("phone", "N/A");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace(); // In lỗi ra console server để dễ debug
            return ResponseEntity.internalServerError().body("Lỗi Server: " + e.getMessage());
        }
    }

    /**
     * Lấy vị trí shipper và customer cho bản đồ giao hàng
     * GET: http://localhost:8080/api/shipper/map/locations?shipperId=1
     */
    @GetMapping("/map/locations")
    public ResponseEntity<List<Map<String, Object>>> getMapLocations(@RequestParam Integer shipperId) {
        List<Map<String, Object>> locations = new ArrayList<>();
        
        // 1. Lấy vị trí shipper hiện tại
        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        if (shipper != null && shipper.getCurrentLat() != null && shipper.getCurrentLong() != null) {
            Map<String, Object> shipperLocation = new HashMap<>();
            shipperLocation.put("id", shipper.getAccountId());
            shipperLocation.put("name", shipper.getFullName() != null ? shipper.getFullName() : "Shipper");
            shipperLocation.put("type", "SHIPPER");
            shipperLocation.put("latitude", shipper.getCurrentLat());
            shipperLocation.put("longitude", shipper.getCurrentLong());
            shipperLocation.put("status", shipper.getStatus() != null ? shipper.getStatus() : "OFFLINE");
            shipperLocation.put("info", (shipper.getVehicleType() != null ? shipper.getVehicleType() : "Xe máy") 
                    + " - " + (shipper.getLicensePlate() != null ? shipper.getLicensePlate() : "N/A"));
            shipperLocation.put("image", shipper.getAvatar());
            shipperLocation.put("phone", shipper.getAccount() != null ? shipper.getAccount().getPhone() : "");
            locations.add(shipperLocation);
        }
        
        // 2. Lấy vị trí customer từ các đơn hàng đang giao (SHIPPING)
        List<Order> shippingOrders = orderRepository.findOrdersByShipperId(shipperId);
        for (Order order : shippingOrders) {
            if ("SHIPPING".equals(order.getStatus()) && order.getShippingLat() != null && order.getShippingLong() != null) {
                // Lấy thông tin customer
                Customer customer = null;
                if (order.getCustomer() != null) {
                    customer = customerRepository.findById(order.getCustomer().getId()).orElse(null);
                }
                
                Map<String, Object> customerLocation = new HashMap<>();
                customerLocation.put("id", order.getId()); // Dùng order ID làm key
                customerLocation.put("name", customer != null && customer.getFullName() != null 
                        ? customer.getFullName() 
                        : (order.getCustomer() != null ? order.getCustomer().getUsername() : "Khách hàng"));
                customerLocation.put("type", "CUSTOMER");
                customerLocation.put("latitude", order.getShippingLat());
                customerLocation.put("longitude", order.getShippingLong());
                customerLocation.put("status", "SHIPPING");
                customerLocation.put("info", order.getShippingAddress() != null ? order.getShippingAddress() : "");
                customerLocation.put("image", null); // Customer entity không có avatar field
                customerLocation.put("phone", order.getCustomer() != null ? order.getCustomer().getPhone() : "");
                customerLocation.put("orderId", order.getId());
                customerLocation.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
                locations.add(customerLocation);
            }
        }
        
        return ResponseEntity.ok(locations);
    }

    /**
     * Shipper đánh giá đơn hàng (đánh giá customer/trải nghiệm giao hàng)
     * POST: http://localhost:8080/api/shipper/orders/{orderId}/feedback
     */
    @PostMapping("/orders/{orderId}/feedback")
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
    @GetMapping("/orders/{orderId}/feedback")
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
