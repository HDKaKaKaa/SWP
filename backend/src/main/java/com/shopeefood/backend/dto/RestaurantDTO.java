package com.shopeefood.backend.dto;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.shopeefood.backend.entity.Restaurant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantDTO {
    private Integer id;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String image;
    private List<String> licenseImages;
    private String status;
    private String rejectionReason;
    private String ownerName; // Hiển thị tên chủ quán
    private String ownerIdCard;
    private Double latitude;
    private Double longitude;
    private String createdAt;

    public RestaurantDTO(Restaurant restaurant) {
        if (restaurant != null) {
            this.id = restaurant.getId();
            this.name = restaurant.getName();
            this.description = restaurant.getDescription();
            this.address = restaurant.getAddress();
            this.phone = restaurant.getPhone();
            this.image = restaurant.getCoverImage();
            this.latitude = restaurant.getLatitude();
            this.longitude = restaurant.getLongitude();
            this.rejectionReason = restaurant.getRejectionReason();

            if (restaurant.getStatus() != null) {
                this.status = restaurant.getStatus().name();
            }
            if (restaurant.getLicenseImage() != null && !restaurant.getLicenseImage().isEmpty()) {
                this.licenseImages = Arrays.asList(restaurant.getLicenseImage().split(","));
            } else {
                this.licenseImages = Collections.emptyList();
            }

            if (restaurant.getOwner() != null) {
                this.ownerName = restaurant.getOwner().getFullName();
                this.ownerIdCard = restaurant.getOwner().getIdCardNumber();
            }

            // Format ngày tạo cho đẹp
            if (restaurant.getCreatedAt() != null) {
                this.createdAt = restaurant.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            }
        }
    }
}