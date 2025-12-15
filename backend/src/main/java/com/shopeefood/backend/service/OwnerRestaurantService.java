package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.RestaurantDTO;
import com.shopeefood.backend.dto.RestaurantRegistrationRequest;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Owner;
import com.shopeefood.backend.repository.RestaurantRepository;
import com.shopeefood.backend.service.CloudinaryService;

import jakarta.persistence.EntityNotFoundException;

import com.shopeefood.backend.repository.OwnerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OwnerRestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private OwnerRepository ownerRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    /**
     * Lấy danh sách tất cả nhà hàng mà Owner đang sở hữu.
     */
    @Transactional(readOnly = true)
    public List<RestaurantDTO> getRestaurantsByOwnerId(Integer accountId) {
        Owner owner = ownerRepository.findByAccount_Id(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy Owner với Account ID này."));

        Integer ownerPKId = owner.getId();
        List<Restaurant> restaurants = restaurantRepository.findByOwnerId(ownerPKId);

        return restaurants.stream()
                .map(RestaurantDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public RestaurantDTO updateRestaurantStatus(
            Integer restaurantId,
            Integer accountId,
            String newStatusString) {

        Owner owner = ownerRepository.findByAccount_Id(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy Owner để xác thực."));

        // Tìm kiếm theo ID nhà hàng VÀ ID Owner
        Restaurant restaurant = restaurantRepository.findByIdAndOwnerId(restaurantId, owner.getId())
                .orElseThrow(() -> new SecurityException("Không tìm thấy Nhà hàng hoặc bạn không có quyền sở hữu."));

        // 3. Phân tích trạng thái mới và xác thực
        Restaurant.RestaurantStatus requestedStatus;
        try {
            requestedStatus = Restaurant.RestaurantStatus.valueOf(newStatusString.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Trạng thái mới không hợp lệ: " + newStatusString);
        }

        // Chỉ cho phép Owner chuyển đổi giữa ACTIVE và CLOSE
        if (!(requestedStatus == Restaurant.RestaurantStatus.ACTIVE
                || requestedStatus == Restaurant.RestaurantStatus.CLOSE)) {
            throw new RuntimeException(
                    "Bạn không thể thiết lập trạng thái này. Chỉ được phép chuyển đổi giữa ACTIVE và CLOSE.");
        }

        restaurant.setStatus(requestedStatus);
        Restaurant updatedRestaurant = restaurantRepository.save(restaurant);

        return new RestaurantDTO(updatedRestaurant);
    }

    @Transactional
    public RestaurantDTO updateRestaurantDetails(
            Integer restaurantId,
            RestaurantRegistrationRequest request,
            MultipartFile newImageFile) throws IOException {

        // 1. Xác thực Owner
        Owner owner = ownerRepository.findByAccount_Id(request.getAccountId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy Owner với Account ID này."));

        // 2. Tìm Nhà hàng và xác thực quyền sở hữu
        Restaurant restaurant = restaurantRepository.findByIdAndOwnerId(restaurantId, owner.getId())
                .orElseThrow(() -> new SecurityException(
                        "Không tìm thấy Nhà hàng hoặc bạn không có quyền sở hữu để cập nhật."));

        // 3. Cập nhật thông tin Owner
        owner.setFullName(request.getOwnerFullName());
        owner.setIdCardNumber(request.getIdCardNumber());

        // 4. Cập nhật thông tin Restaurant từ DTO
        restaurant.setName(request.getRestaurantName());
        restaurant.setAddress(request.getAddress());
        restaurant.setPhone(request.getPhone());
        restaurant.setDescription(request.getDescription());
        restaurant.setLatitude(request.getLatitude());
        restaurant.setLongitude(request.getLongitude());

        // 5. Xử lý Ảnh bìa mới
        if (newImageFile != null && !newImageFile.isEmpty()) {
            String newImageUrl = cloudinaryService.uploadImage(newImageFile);
            restaurant.setCoverImage(newImageUrl);
        } else {
            restaurant.setCoverImage(request.getCoverImageUrl());
        }

        // 6. THÊM LOGIC: Bắt buộc chuyển trạng thái sang PENDING khi thông tin thay đổi
        restaurant.setStatus(Restaurant.RestaurantStatus.PENDING);

        Restaurant updatedRestaurant = restaurantRepository.save(restaurant);
        return new RestaurantDTO(updatedRestaurant);
    }
}