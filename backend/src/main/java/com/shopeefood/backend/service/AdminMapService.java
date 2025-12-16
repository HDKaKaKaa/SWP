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

        // --- SỬA Ở ĐÂY: Dùng findAll() thay vì findByStatus() ---
        // Lấy tất cả nhà hàng bất kể trạng thái (CLOSE, PENDING, BLOCKED...)
        List<Restaurant> restaurants = restaurantRepository.findAll();

        for (Restaurant r : restaurants) {
            // Chỉ cần có tọa độ là hiển thị
            if (r.getLatitude() != null && r.getLongitude() != null) {

                // Xử lý null safe cho status và phone
                String statusStr = (r.getStatus() != null) ? r.getStatus().name() : "UNKNOWN";
                String phoneStr = (r.getPhone() != null) ? r.getPhone() : "";

                locations.add(new MapLocationDTO(
                        r.getId(),
                        r.getName(),
                        "RESTAURANT",
                        r.getLatitude(),
                        r.getLongitude(),
                        statusStr,              // Hiển thị đúng status hiện tại (VD: CLOSE)
                        r.getAddress(),
                        r.getCoverImage(),
                        phoneStr
                ));
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