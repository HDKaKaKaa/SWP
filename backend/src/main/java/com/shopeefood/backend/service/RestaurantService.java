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
import com.shopeefood.backend.dto.RestaurantRatingSummary;
import java.util.stream.Collectors;
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
        Owner owner = ownerRepository.findById(request.getAccountId()).orElse(null);

        if (owner == null) {
            owner = new Owner();
            owner.setAccount(account);
            owner.setFullName(request.getOwnerFullName());
            owner.setIdCardNumber(request.getIdCardNumber());
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

        if (request.getLicenseImages() != null && !request.getLicenseImages().isEmpty()) {
            String joinedLicenseUrls = String.join(",", request.getLicenseImages());
            restaurant.setLicenseImage(joinedLicenseUrls);
        }

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

        // --- BỔ SUNG ĐOẠN NÀY ĐỂ CẬP NHẬT ẢNH GIẤY PHÉP ---
        if (request.getLicenseImages() != null && !request.getLicenseImages().isEmpty()) {
            // Nối danh sách link ảnh thành chuỗi (cách nhau bởi dấu phẩy) để lưu vào DB
            String joinedLicenseUrls = String.join(",", request.getLicenseImages());
            restaurant.setLicenseImage(joinedLicenseUrls);
        } else {
            // (Tuỳ chọn) Nếu danh sách gửi lên rỗng thì xóa ảnh cũ hoặc giữ nguyên tùy
            // logic bạn muốn
            // Ở đây nếu frontend gửi mảng rỗng thì ta set rỗng
            restaurant.setLicenseImage("");
        }

        // Cập nhật tọa độ
        if (request.getLatitude() != null && request.getLongitude() != null) {
            restaurant.setLatitude(request.getLatitude());
            restaurant.setLongitude(request.getLongitude());
        }

        // 3. Cập nhật thông tin Owner
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
    public Page<RestaurantLandingDTO> getActiveRestaurantsWithRating(
            String keyword,
            Double userLat,
            Double userLng,
            String sortBy,
            Pageable pageable) {

        // --- SỬA LỖI Ở ĐÂY ---
        // 1. TẠO BIẾN MỚI (EFFECTIVELY FINAL)
        // Thay vì gán đè lên tham số (userLat = ...), ta tạo biến mới.
        // Điều này giúp Java hiểu rằng giá trị này không đổi và có thể dùng an toàn
        // trong Lambda (.map)
        Double finalLat = (userLat == null) ? 0.0 : userLat;
        Double finalLng = (userLng == null) ? 0.0 : userLng;
        String finalSortBy = (sortBy == null || sortBy.isEmpty()) ? "newest" : sortBy;

        // 2. GỌI REPOSITORY VỚI BIẾN MỚI
        // Lưu ý: Dùng finalLat, finalLng, finalSortBy thay vì biến cũ
        Page<Restaurant> restaurantPage = restaurantRepository.searchRestaurantsAdvanced(
                (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null,
                Restaurant.RestaurantStatus.ACTIVE.name(),
                finalLat,
                finalLng,
                finalSortBy,
                pageable);

        // 3. MAP ENTITY -> DTO
        return restaurantPage.map(restaurant -> {
            RestaurantLandingDTO dto = new RestaurantLandingDTO();
            dto.setId(restaurant.getId());
            dto.setName(restaurant.getName());
            dto.setAddress(restaurant.getAddress());
            dto.setCoverImage(restaurant.getCoverImage());

            if (restaurant.getOwner() != null && restaurant.getOwner().getAccount() != null) {
                dto.setOwnerAccountId(restaurant.getOwner().getAccount().getId());
            }

            Double avgRating = feedbackRepository.getAverageRating(restaurant.getId());
            Long totalReviews = feedbackRepository.countByRestaurantId(restaurant.getId());

            dto.setAverageRating(avgRating != null ? avgRating : 0.0);
            dto.setTotalReviews(totalReviews != null ? totalReviews : 0L);

            // TÍNH KHOẢNG CÁCH
            // Lưu ý: Dùng finalLat và finalLng ở đây để tránh lỗi biên dịch
            if (restaurant.getLatitude() != null && restaurant.getLongitude() != null) {
                // Kiểm tra khác 0.0
                if (finalLat != 0.0 && finalLng != 0.0) {
                    double dist = calculateDistance(finalLat, finalLng, restaurant.getLatitude(),
                            restaurant.getLongitude());
                    dto.setDistance(dist);
                }
            }

            return dto;
        });
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Bán kính trái đất (km)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Trả về km
    }
}