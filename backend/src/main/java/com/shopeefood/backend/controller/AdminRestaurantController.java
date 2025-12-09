package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.RestaurantDTO;
import com.shopeefood.backend.service.AdminRestaurantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/restaurants")
public class AdminRestaurantController {

    @Autowired
    private AdminRestaurantService adminRestaurantService;

    // GET: Lấy danh sách quán chờ duyệt
    // URL: /api/admin/restaurants/pending
    @GetMapping("/pending")
    public ResponseEntity<List<RestaurantDTO>> getPendingRestaurants(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        return ResponseEntity.ok(adminRestaurantService.getPendingRestaurants(startDate, endDate));
    }

    // PUT: Duyệt hoặc Từ chối quán
    // URL: /api/admin/restaurants/{id}/approve?isApproved=true (Duyệt)
    // URL: /api/admin/restaurants/{id}/approve?isApproved=false (Từ chối)
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveRestaurant(
            @PathVariable Integer id,
            @RequestParam boolean isApproved) {
        try {
            adminRestaurantService.approveRestaurant(id, isApproved);
            String message = isApproved ? "Đã duyệt quán thành công!" : "Đã từ chối quán!";
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // PUT: Khóa / Mở khóa
    // URL: /api/admin/restaurants/{id}/toggle-status
    @PutMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable Integer id) {
        try {
            adminRestaurantService.toggleRestaurantStatus(id);
            return ResponseEntity.ok("Cập nhật trạng thái thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage()); // Trả về lỗi nếu còn đơn hàng
        }
    }

    @GetMapping
    public ResponseEntity<List<RestaurantDTO>> getManagedRestaurants(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status // Nhận thêm param này
    ) {
        return ResponseEntity.ok(adminRestaurantService.getManagedRestaurants(keyword, status));
    }
}