package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.RestaurantRegistrationRequest;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.RestaurantRepository;
import com.shopeefood.backend.service.RestaurantService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@CrossOrigin("*")
public class RestaurantController {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private RestaurantService restaurantService;

    // API: http://localhost:8080/api/restaurants (Lấy hết)
    // API: http://localhost:8080/api/restaurants?keyword=chay (Tìm kiếm)

    @GetMapping
    public List<Restaurant> getAllRestaurants(@RequestParam(required = false) String keyword) {
        // Chỉ lấy những quán đang HOẠT ĐỘNG (ACTIVE)
        Restaurant.RestaurantStatus activeStatus = Restaurant.RestaurantStatus.ACTIVE;

        if (keyword != null && !keyword.isEmpty()) {
            // Nếu có từ khóa tìm kiếm -> Tìm theo tên VÀ trạng thái ACTIVE
            return restaurantRepository.findByNameContainingAndStatus(keyword, activeStatus);
        } else {
            // Nếu không tìm kiếm -> Lấy tất cả quán ACTIVE
            return restaurantRepository.findByStatus(activeStatus);
        }
    }

    // @GetMapping
    // public List<Restaurant> getRestaurants(@RequestParam(required = false) String
    // keyword) {
    // if (keyword != null && !keyword.isEmpty()) {
    // return restaurantRepository.searchRestaurants(keyword);
    // }
    // return restaurantRepository.findAll();
    // }

    // API: http://localhost:8080/api/restaurants/1 (Lấy chi tiết 1 quán theo ID)
    @GetMapping("/{id}")
    public ResponseEntity<Restaurant> getRestaurantById(@PathVariable Integer id) {
        return restaurantRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerRestaurant(@RequestBody RestaurantRegistrationRequest request) {
        try {
            Restaurant newRestaurant = restaurantService.registerRestaurant(request);
            return ResponseEntity.ok(newRestaurant);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi hệ thống: " + e.getMessage());
        }
    }

    // API lấy danh sách quán đã đăng ký của 1 user cụ thể
    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<Restaurant>> getRestaurantsByAccountId(@PathVariable Integer accountId) {
        List<Restaurant> list = restaurantRepository.findByOwnerId(accountId);
        return ResponseEntity.ok(list);
    }

    // API Cập nhật quán: PUT /api/restaurants/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRestaurant(@PathVariable Integer id,
            @RequestBody RestaurantRegistrationRequest request) {
        try {
            Restaurant updatedRestaurant = restaurantService.updateRestaurant(id, request);
            return ResponseEntity.ok(updatedRestaurant);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi hệ thống: " + e.getMessage());
        }
    }
}