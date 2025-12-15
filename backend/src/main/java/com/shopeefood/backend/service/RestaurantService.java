package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.RestaurantRegistrationRequest;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Owner;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.AccountRepository;
import com.shopeefood.backend.repository.OwnerRepository;
import com.shopeefood.backend.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.shopeefood.backend.dto.RestaurantLandingDTO;
import com.shopeefood.backend.repository.FeedbackRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

@Service
public class RestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private OwnerRepository ownerRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Transactional
    public Restaurant registerRestaurant(RestaurantRegistrationRequest request) {
        // 1. Kiểm tra Account tồn tại không
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // 2. Xử lý thông tin Owner
        // Kiểm tra xem Account này đã là Owner chưa
        Owner owner = ownerRepository.findById(request.getAccountId()).orElse(null);

        if (owner == null) {
            // Chưa là Owner -> Tạo mới
            owner = new Owner();
            owner.setAccount(account);
            owner.setFullName(request.getOwnerFullName());
            owner.setIdCardNumber(request.getIdCardNumber());
            // Lưu Owner trước
            owner = ownerRepository.save(owner);

        } else {
            // Đã là Owner -> Cập nhật lại thông tin mới nhất (nếu muốn)
            owner.setFullName(request.getOwnerFullName());
            owner.setIdCardNumber(request.getIdCardNumber());
            ownerRepository.save(owner);
        }

        // 3. Tạo Restaurant mới
        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.getRestaurantName());
        restaurant.setAddress(request.getAddress());
        restaurant.setPhone(request.getPhone());
        restaurant.setDescription(request.getDescription());
        restaurant.setCoverImage(request.getCoverImageUrl());
        restaurant.setLatitude(request.getLatitude());
        restaurant.setLongitude(request.getLongitude());

        // Set quan hệ
        restaurant.setOwner(owner);

        // Set các trường mặc định
        restaurant.setStatus(Restaurant.RestaurantStatus.PENDING);
        restaurant.setCreatedAt(LocalDateTime.now());

        return restaurantRepository.save(restaurant);
    }

    @Transactional
    public Restaurant updateRestaurant(Integer id, RestaurantRegistrationRequest request) {
        // 1. Tìm quán theo ID
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy quán ăn với ID: " + id));

        // 2. Cập nhật thông tin quán
        restaurant.setName(request.getRestaurantName());
        restaurant.setAddress(request.getAddress());
        restaurant.setPhone(request.getPhone());
        restaurant.setDescription(request.getDescription());
        restaurant.setCoverImage(request.getCoverImageUrl());

        // Cập nhật tọa độ nếu có (đề phòng user đổi địa chỉ map)
        if (request.getLatitude() != null && request.getLongitude() != null) {
            restaurant.setLatitude(request.getLatitude());
            restaurant.setLongitude(request.getLongitude());
        }

        // 3. Cập nhật thông tin Owner (vì user có thể sửa lỗi chính tả tên/CCCD)
        Owner owner = restaurant.getOwner();
        if (owner != null) {
            owner.setFullName(request.getOwnerFullName());
            owner.setIdCardNumber(request.getIdCardNumber());
            ownerRepository.save(owner);
        }

        // 4. QUAN TRỌNG: Reset trạng thái về PENDING để chờ duyệt lại
        restaurant.setStatus(Restaurant.RestaurantStatus.PENDING);

        return restaurantRepository.save(restaurant);
    }

    // Hàm lấy danh sách cho Landing Page
    public Page<RestaurantLandingDTO> getActiveRestaurantsWithRating(String keyword, Pageable pageable) {
        Restaurant.RestaurantStatus activeStatus = Restaurant.RestaurantStatus.ACTIVE;
        Page<Restaurant> restaurantPage;

        // 1. Lấy dữ liệu thô từ DB
        if (keyword != null && !keyword.isEmpty()) {
            restaurantPage = restaurantRepository.findByNameContainingAndStatus(keyword, activeStatus, pageable);
        } else {
            restaurantPage = restaurantRepository.findByStatus(activeStatus, pageable);
        }

        // 2. Map từ Entity -> DTO và tính toán Rating cho từng quán
        return restaurantPage.map(restaurant -> {
            RestaurantLandingDTO dto = new RestaurantLandingDTO();
            dto.setId(restaurant.getId());
            dto.setName(restaurant.getName());
            dto.setAddress(restaurant.getAddress());
            dto.setCoverImage(restaurant.getCoverImage());

            // Gọi FeedbackRepository để lấy rating
            Double avgRating = feedbackRepository.getAverageRating(restaurant.getId());
            Long totalReviews = feedbackRepository.countByRestaurantId(restaurant.getId());

            // Nếu chưa có rating nào thì set mặc định 5 hoặc 0 tùy bạn
            dto.setAverageRating(avgRating != null ? avgRating : 0.0);
            dto.setTotalReviews(totalReviews != null ? totalReviews : 0L);

            return dto;
        });
    }
}