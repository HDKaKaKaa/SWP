package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.RestaurantDTO;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.OrderRepository;
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
    @Autowired
    private OrderRepository orderRepository; // <--- Inject thêm cái này


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


    // 3. Lấy danh sách quản lý (Có tìm kiếm)
    @Transactional(readOnly = true)
    public List<RestaurantDTO> getManagedRestaurants(String keyword) {
        List<Restaurant> restaurants;
        if (keyword != null && !keyword.trim().isEmpty()) {
            restaurants = restaurantRepository.searchForAdmin(keyword.trim());
        } else {
            restaurants = restaurantRepository.findAllManaged();
        }
        return restaurants.stream().map(RestaurantDTO::new).collect(Collectors.toList());
    }

    // 4. Khóa / Mở khóa nhà hàng
    @Transactional
    public void toggleRestaurantStatus(Integer id) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy quán ăn"));

        if (restaurant.getStatus() == Restaurant.RestaurantStatus.ACTIVE) {
            // --- LOGIC KHÓA QUÁN ---
            // 1. Kiểm tra có đơn hàng đang chạy không
            long activeOrders = orderRepository.countActiveOrdersByRestaurant(id);
            if (activeOrders > 0) {
                throw new RuntimeException("Không thể khóa! Quán đang có " + activeOrders + " đơn hàng chưa hoàn thành.");
            }
            // 2. Chuyển sang BLOCKED
            restaurant.setStatus(Restaurant.RestaurantStatus.BLOCKED);
        } else if (restaurant.getStatus() == Restaurant.RestaurantStatus.BLOCKED) {
            // --- LOGIC MỞ KHÓA ---
            restaurant.setStatus(Restaurant.RestaurantStatus.ACTIVE);
        } else {
            throw new RuntimeException("Không thể thay đổi trạng thái của quán này (Đang Pending hoặc Rejected)");
        }

        restaurantRepository.save(restaurant);
    }

    @Transactional(readOnly = true)
    public List<RestaurantDTO> getManagedRestaurants(String keyword, String statusFilter) {

        // 1. Xác định danh sách status cần tìm
        List<Restaurant.RestaurantStatus> statuses;

        if ("ACTIVE".equalsIgnoreCase(statusFilter)) {
            statuses = List.of(Restaurant.RestaurantStatus.ACTIVE);
        } else if ("BLOCKED".equalsIgnoreCase(statusFilter)) {
            statuses = List.of(Restaurant.RestaurantStatus.BLOCKED);
        } else {
            // Mặc định (hoặc chọn ALL) thì lấy cả 2
            statuses = List.of(Restaurant.RestaurantStatus.ACTIVE, Restaurant.RestaurantStatus.BLOCKED);
        }

        // 2. Xử lý keyword null
        String searchKey = (keyword == null) ? "" : keyword.trim();

        // 3. Gọi Repository
        List<Restaurant> restaurants = restaurantRepository.findByStatusesAndKeyword(statuses, searchKey);

        return restaurants.stream().map(RestaurantDTO::new).collect(Collectors.toList());
    }
}