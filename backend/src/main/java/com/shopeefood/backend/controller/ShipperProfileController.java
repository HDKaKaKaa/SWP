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
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/shipper")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174" })
public class ShipperProfileController {

    @Autowired
    private ShipperRepository shipperRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

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
     * Lấy thông tin công khai của shipper
     * GET: http://localhost:8080/api/shipper/public/{id}
     */
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
}

