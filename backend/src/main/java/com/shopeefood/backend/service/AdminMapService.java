package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.MapLocationDTO;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Shipper;
import com.shopeefood.backend.repository.RestaurantRepository;
import com.shopeefood.backend.repository.ShipperRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AdminMapService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private ShipperRepository shipperRepository;

    @Transactional(readOnly = true)
    public List<MapLocationDTO> getAllLocations() {
        List<MapLocationDTO> locations = new ArrayList<>();

        // 1. LẤY DANH SÁCH NHÀ HÀNG
        List<Restaurant> restaurants = restaurantRepository.findAll();

        for (Restaurant r : restaurants) {
            // Điều kiện 1: Phải có tọa độ
            if (r.getLatitude() != null && r.getLongitude() != null) {

                // Điều kiện 2: Chỉ lấy trạng thái ACTIVE hoặc CLOSE
                boolean isVisible = r.getStatus() == Restaurant.RestaurantStatus.ACTIVE
                        || r.getStatus() == Restaurant.RestaurantStatus.CLOSE;

                if (isVisible) {
                    String statusStr = (r.getStatus() != null) ? r.getStatus().name() : "UNKNOWN";
                    String phoneStr = (r.getPhone() != null) ? r.getPhone() : "";

                    locations.add(new MapLocationDTO(
                            r.getId(),
                            r.getName(),
                            "RESTAURANT",
                            r.getLatitude(),
                            r.getLongitude(),
                            statusStr,
                            r.getAddress(),
                            r.getCoverImage(),
                            phoneStr
                    ));
                }
            }
        }

        // 2. LẤY DANH SÁCH SHIPPER (Giữ nguyên)
        List<Shipper> shippers = shipperRepository.findAll();
        for (Shipper s : shippers) {
            if (s.getCurrentLat() != null && s.getCurrentLong() != null) {
                String status = "ONLINE";
                if (s.getAccount() != null && !Boolean.TRUE.equals(s.getAccount().getIsActive())) {
                    status = "BLOCKED";
                }

                String phoneStr = (s.getAccount() != null) ? s.getAccount().getPhone() : "";
                String vehicleInfo = (s.getVehicleType() != null ? s.getVehicleType() : "Xe máy")
                        + " - " + (s.getLicensePlate() != null ? s.getLicensePlate() : "N/A");

                locations.add(new MapLocationDTO(
                        s.getAccountId(),
                        s.getFullName(),
                        "SHIPPER",
                        s.getCurrentLat(),
                        s.getCurrentLong(),
                        status,
                        vehicleInfo,
                        null,
                        phoneStr
                ));
            }
        }

        return locations;
    }
}