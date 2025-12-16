package com.shopeefood.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class RestaurantRegistrationRequest {
    // Thông tin nhà hàng
    private String restaurantName;
    private String address;
    private String phone;
    private String description;
    private String coverImageUrl;
    private Double latitude;
    private Double longitude;
    private List<String> licenseImages;

    // Thông tin Owner
    private String ownerFullName;
    private String idCardNumber;
    private Integer accountId;
}