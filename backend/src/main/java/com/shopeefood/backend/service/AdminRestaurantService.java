package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.ProductDTO;
import com.shopeefood.backend.dto.RestaurantDTO;
import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.OrderRepository;
import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminRestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;
    @Autowired
    private OrderRepository orderRepository; // <--- Inject thêm cái này
    @Autowired
    private ProductRepository productRepository;


    // 1. Lấy danh sách quán đang chờ duyệt (PENDING)
    @Transactional(readOnly = true)
    public List<RestaurantDTO> getPendingRestaurants(LocalDate startDate, LocalDate endDate, String keyword) {

        // 1. Xử lý ngày: Nếu null thì truyền null xuống Repo (để lấy All)
        LocalDateTime startDateTime = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        // 2. Xử lý keyword: Thêm dấu % và lowercase tại Java
        String searchKey = null;
        if (keyword != null && !keyword.trim().isEmpty()) {
            searchKey = "%" + keyword.trim().toLowerCase() + "%";
        }

        // 3. Gọi Repo
        List<Restaurant> pendingList = restaurantRepository.findPendingRestaurants(
                startDateTime,
                endDateTime,
                searchKey
        );

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

        // TRƯỜNG HỢP 1: KHÓA QUÁN (Áp dụng cho cả ACTIVE và CLOSE)
        if (restaurant.getStatus() == Restaurant.RestaurantStatus.ACTIVE ||
                restaurant.getStatus() == Restaurant.RestaurantStatus.CLOSE) { // <--- Thêm điều kiện này

            // Logic kiểm tra đơn hàng cũ (giữ nguyên)
            long activeOrders = orderRepository.countActiveOrdersByRestaurant(id);
            if (activeOrders > 0) {
                throw new RuntimeException("Không thể khóa! Quán đang có " + activeOrders + " đơn hàng chưa hoàn thành.");
            }

            restaurant.setStatus(Restaurant.RestaurantStatus.BLOCKED);

            // TRƯỜNG HỢP 2: MỞ KHÓA (Áp dụng cho BLOCKED)
        } else if (restaurant.getStatus() == Restaurant.RestaurantStatus.BLOCKED) {
            restaurant.setStatus(Restaurant.RestaurantStatus.ACTIVE);

        } else {
            // Các trạng thái khác như PENDING, REJECTED
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
        } else if ("CLOSE".equalsIgnoreCase(statusFilter)) {
            statuses = List.of(Restaurant.RestaurantStatus.CLOSE);
        }
            else {
            // Mặc định (hoặc chọn ALL) thì lấy cả 2
            statuses = List.of(Restaurant.RestaurantStatus.ACTIVE, Restaurant.RestaurantStatus.BLOCKED, Restaurant.RestaurantStatus.CLOSE);
        }

        // 2. Xử lý keyword null
        String searchKey = (keyword == null) ? "" : keyword.trim();

        // 3. Gọi Repository
        List<Restaurant> restaurants = restaurantRepository.findByStatusesAndKeyword(statuses, searchKey);

        return restaurants.stream().map(RestaurantDTO::new).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> getMenuByRestaurant(Integer restaurantId) {
        List<Product> products = productRepository.findByRestaurantId(restaurantId);
        return products.stream().map(ProductDTO::new).collect(Collectors.toList());
    }
}