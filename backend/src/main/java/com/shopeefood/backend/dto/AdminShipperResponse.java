package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class AdminShipperResponse {
    private Integer accountId;
    private String username;
    private String role;

    private String email;
    private String phone;
    private Boolean isActive;

    private String fullName;
    private String licensePlate;
    private String vehicleType;
    private String status; // OFFLINE, ONLINE, BUSY
}
