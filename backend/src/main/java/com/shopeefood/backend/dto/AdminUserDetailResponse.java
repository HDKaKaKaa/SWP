package com.shopeefood.backend.dto;

import lombok.Data;

import java.util.List;

/**
 * Response dùng cho Admin xem chi tiết 1 người dùng theo accountId.
 * Frontend sẽ dựa vào "role" để render 3 modal khác nhau.
 */
@Data
public class AdminUserDetailResponse {

    // ===== Common (accounts) =====
    private Integer accountId;
    private String username;
    private String email;
    private String phone;
    private String role;
    private Boolean isActive;

    // ===== CUSTOMER (customers) =====
    private String customerFullName;
    private String customerAddress;
    private Double customerLatitude;
    private Double customerLongitude;

    // ===== SHIPPER (shippers) =====
    private String shipperFullName;
    private String shipperLicensePlate;
    private String shipperVehicleType;
    private String shipperStatus;
    private Double shipperCurrentLat;
    private Double shipperCurrentLong;

    // ===== OWNER (owners + restaurants) =====
    private String ownerFullName;
    private String ownerIdCardNumber;
    private List<AdminRestaurantBriefDTO> restaurants;
}
