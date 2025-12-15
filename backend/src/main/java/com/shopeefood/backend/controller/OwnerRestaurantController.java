package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.RestaurantDTO;
import com.shopeefood.backend.service.OwnerRestaurantService;

import org.springframework.beans.factory.annotation.Autowired; 
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map; 
import com.shopeefood.backend.dto.RestaurantRegistrationRequest;
import org.springframework.web.multipart.MultipartFile; 

@RestController
@RequestMapping("/api/owner/restaurants")
@CrossOrigin(origins = "http://localhost:5173")
public class OwnerRestaurantController {

    @Autowired
    private OwnerRestaurantService ownerRestaurantService;
    /**
     * API 1: Lấy danh sách tất cả nhà hàng của Owner.
     * GET /api/owner/restaurants?accountId={id}
     */
    @GetMapping
    public ResponseEntity<List<RestaurantDTO>> getOwnerRestaurants(
            @RequestParam Integer accountId) {
        List<RestaurantDTO> restaurants = ownerRestaurantService.getRestaurantsByOwnerId(accountId);
        return ResponseEntity.ok(restaurants);
    }

    /**
     * API 2: Đổi trạng thái nhà hàng (Mở/Đóng).
     * PUT /api/owner/restaurants/{restaurantId}/status?accountId={id}
     */
    @PutMapping("/{restaurantId}/status")
    public ResponseEntity<?> updateStatus( 
            @PathVariable Integer restaurantId,
            @RequestParam Integer accountId,
            @RequestBody Map<String, String> statusUpdate) { // Sử dụng Map<String, String>

        String newStatusString = statusUpdate.get("status");

        try {
            // Giả định hàm trong Service đã được đổi tên thành updateRestaurantStatus
            RestaurantDTO updatedRestaurant = ownerRestaurantService.updateRestaurantStatus(
                    restaurantId,
                    accountId,
                    newStatusString); 
            return ResponseEntity.ok(updatedRestaurant);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    // ----------------------------------------------------------------------------------
    // API 3: THÊM ENDPOINT ĐỂ CẬP NHẬT THÔNG TIN VÀ CHUYỂN TRẠNG THÁI SANG PENDING
    // ----------------------------------------------------------------------------------

    /**
     * API 3: Cập nhật thông tin chi tiết nhà hàng (Kích hoạt lại quá trình duyệt PENDING).
     * PUT /api/owner/restaurants/{restaurantId}
     */
    @PutMapping("/{restaurantId}")
    public ResponseEntity<?> updateRestaurantDetails(
            @PathVariable Integer restaurantId,
            @ModelAttribute RestaurantRegistrationRequest request, // Nhận dữ liệu form
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile) {
        
        try {
            RestaurantDTO updatedRestaurant = ownerRestaurantService.updateRestaurantDetails(
                restaurantId, 
                request, 
                imageFile);
            return ResponseEntity.ok(updatedRestaurant);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}