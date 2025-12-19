package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shipper/map")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174" })
public class ShipperMapController {

    @Autowired
    private ShipperRepository shipperRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    /**
     * Lấy vị trí shipper và customer cho bản đồ giao hàng
     * GET: http://localhost:8080/api/shipper/map/locations?shipperId=1
     */
    @GetMapping("/locations")
    public ResponseEntity<List<Map<String, Object>>> getMapLocations(@RequestParam Integer shipperId) {
        List<Map<String, Object>> locations = new ArrayList<>();
        
        // 1. Lấy vị trí shipper hiện tại
        Shipper shipper = shipperRepository.findById(shipperId).orElse(null);
        if (shipper != null) {
            Double shipperLat = shipper.getCurrentLat();
            Double shipperLong = shipper.getCurrentLong();
            
            // Validate tọa độ: Kiểm tra xem có nằm trong phạm vi hợp lý của Việt Nam không
            // Hà Nội: lat ~21.0, long ~105.8
            // Phạm vi hợp lý: lat 8.0-23.0, long 102.0-110.0 (toàn bộ Việt Nam)
            boolean isValidLocation = shipperLat != null && shipperLong != null
                    && shipperLat >= 8.0 && shipperLat <= 23.0
                    && shipperLong >= 102.0 && shipperLong <= 110.0;
            
            // Nếu tọa độ không hợp lệ, set mặc định về Hà Nội
            if (!isValidLocation) {
                shipperLat = 21.0285; // Hà Nội
                shipperLong = 105.8542;
                // Tự động cập nhật lại database với tọa độ đúng
                shipper.setCurrentLat(shipperLat);
                shipper.setCurrentLong(shipperLong);
                shipperRepository.save(shipper);
            }
            
            Map<String, Object> shipperLocation = new HashMap<>();
            shipperLocation.put("id", shipper.getAccountId());
            shipperLocation.put("name", shipper.getFullName() != null ? shipper.getFullName() : "Shipper");
            shipperLocation.put("type", "SHIPPER");
            shipperLocation.put("latitude", shipperLat);
            shipperLocation.put("longitude", shipperLong);
            shipperLocation.put("status", shipper.getStatus() != null ? shipper.getStatus() : "OFFLINE");
            shipperLocation.put("info", (shipper.getVehicleType() != null ? shipper.getVehicleType() : "Xe máy") 
                    + " - " + (shipper.getLicensePlate() != null ? shipper.getLicensePlate() : "N/A"));
            shipperLocation.put("image", shipper.getAvatar());
            shipperLocation.put("phone", shipper.getAccount() != null ? shipper.getAccount().getPhone() : "");
            locations.add(shipperLocation);
        }
        
        // 2. Lấy vị trí customer và restaurant từ các đơn hàng đang giao (SHIPPING)
        List<Order> shippingOrders = orderRepository.findOrdersByShipperId(shipperId);
        for (Order order : shippingOrders) {
            if ("SHIPPING".equals(order.getStatus())) {
                // 2.1. Thêm vị trí customer
                if (order.getShippingLat() != null && order.getShippingLong() != null) {
                    // Lấy thông tin customer
                    Customer customer = null;
                    if (order.getCustomer() != null) {
                        customer = customerRepository.findById(order.getCustomer().getId()).orElse(null);
                    }
                    
                    Map<String, Object> customerLocation = new HashMap<>();
                    customerLocation.put("id", order.getId()); // Dùng order ID làm key
                    customerLocation.put("name", customer != null && customer.getFullName() != null 
                            ? customer.getFullName() 
                            : (order.getCustomer() != null ? order.getCustomer().getUsername() : "Khách hàng"));
                    customerLocation.put("type", "CUSTOMER");
                    customerLocation.put("latitude", order.getShippingLat());
                    customerLocation.put("longitude", order.getShippingLong());
                    customerLocation.put("status", "SHIPPING");
                    customerLocation.put("info", order.getShippingAddress() != null ? order.getShippingAddress() : "");
                    customerLocation.put("image", null); // Customer entity không có avatar field
                    customerLocation.put("phone", order.getCustomer() != null ? order.getCustomer().getPhone() : "");
                    customerLocation.put("orderId", order.getId());
                    customerLocation.put("restaurantName", order.getRestaurant() != null ? order.getRestaurant().getName() : "N/A");
                    locations.add(customerLocation);
                }
                
                // 2.2. Thêm vị trí restaurant
                if (order.getRestaurant() != null && order.getRestaurant().getLatitude() != null && order.getRestaurant().getLongitude() != null) {
                    Map<String, Object> restaurantLocation = new HashMap<>();
                    restaurantLocation.put("id", order.getRestaurant().getId());
                    restaurantLocation.put("name", order.getRestaurant().getName() != null ? order.getRestaurant().getName() : "Nhà hàng");
                    restaurantLocation.put("type", "RESTAURANT");
                    restaurantLocation.put("latitude", order.getRestaurant().getLatitude());
                    restaurantLocation.put("longitude", order.getRestaurant().getLongitude());
                    restaurantLocation.put("status", "ACTIVE");
                    restaurantLocation.put("info", order.getRestaurant().getAddress() != null ? order.getRestaurant().getAddress() : "");
                    restaurantLocation.put("image", order.getRestaurant().getCoverImage());
                    restaurantLocation.put("phone", order.getRestaurant().getPhone() != null ? order.getRestaurant().getPhone() : "");
                    restaurantLocation.put("orderId", order.getId());
                    locations.add(restaurantLocation);
                }
            }
        }
        
        return ResponseEntity.ok(locations);
    }
}

