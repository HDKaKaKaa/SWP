package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.ChangePasswordRequest;
import com.shopeefood.backend.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
public class ChangePasswordController {

    @Autowired
    private CustomerService customerService;

    // API đơn giản hóa: PUT /api/customers/change-password
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        try {
            // Gọi service xử lý
            customerService.changePassword(request);
            return ResponseEntity.ok("Đổi mật khẩu thành công!");
        } catch (RuntimeException e) {
            // Trả về lỗi 400 kèm thông báo
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi hệ thống: " + e.getMessage());
        }
    }
}