package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@CrossOrigin(origins = "http://localhost:5173")
public class RestaurantController {

    @Autowired
    private RestaurantRepository restaurantRepository;

    // API: http://localhost:8080/api/restaurants (Lấy hết)
    // API: http://localhost:8080/api/restaurants?keyword=chay (Tìm kiếm)
    @GetMapping
    public List<Restaurant> getRestaurants(@RequestParam(required = false) String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            return restaurantRepository.searchRestaurants(keyword);
        }
        return restaurantRepository.findAll();
    }

    // API: http://localhost:8080/api/restaurants/1 (Lấy chi tiết 1 quán theo ID)
    @GetMapping("/{id}")
    public ResponseEntity<Restaurant> getRestaurantById(@PathVariable Integer id) {
        return restaurantRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}