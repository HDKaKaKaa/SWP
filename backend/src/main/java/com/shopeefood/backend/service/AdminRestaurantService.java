package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.RestaurantDTO;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminRestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    // 1. Lấy danh sách quán đang chờ duyệt (PENDING)
    @Transactional(readOnly = true)
    public List<RestaurantDTO> getPendingRestaurants() {
        // Gọi Enum nội bộ: Restaurant.RestaurantStatus.PENDING
        List<Restaurant> pendingList = restaurantRepository.findByStatus(Restaurant.RestaurantStatus.PENDING);

        return pendingList.stream()
                .map(RestaurantDTO::new)
                .collect(Collectors.toList());
    }

    // 2. Duyệt hoặc Từ chối quán
    @Transactional
    public void approveRestaurant(Integer id, boolean isApproved) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy quán ăn với ID: " + id));

        if (isApproved) {
            restaurant.setStatus(Restaurant.RestaurantStatus.ACTIVE);
        } else {
            restaurant.setStatus(Restaurant.RestaurantStatus.REJECTED);
        }

        restaurantRepository.save(restaurant);
    }
}