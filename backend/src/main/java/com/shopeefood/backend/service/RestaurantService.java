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

import java.time.LocalDateTime;

@Service
public class RestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private OwnerRepository ownerRepository;

    @Autowired
    private AccountRepository accountRepository;

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

            // Cập nhật role cho Account nếu cần (tùy logic của bạn)
            account.setRole("OWNER");
            accountRepository.save(account);
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
}