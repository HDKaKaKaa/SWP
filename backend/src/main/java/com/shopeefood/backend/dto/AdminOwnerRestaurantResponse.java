package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class AdminOwnerRestaurantResponse {
    private Integer accountId;
    private String username;
    private String role;

    private String email;
    private String phone;
    private Boolean isActive;

    // Thông tin chủ quán
    private String ownerFullName;
    private String ownerIdCardNumber;

    // Thông tin quán
    private Integer restaurantId;
    private String restaurantName;
    private String restaurantAddress;
    private String restaurantPhone;
    private String restaurantCoverImage;
    private String restaurantStatus; // PENDING / ACTIVE / BLOCKED / REJECTED
}
