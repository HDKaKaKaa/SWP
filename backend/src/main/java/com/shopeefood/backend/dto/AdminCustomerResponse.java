package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class AdminCustomerResponse {
    private Integer accountId;
    private String username;
    private String role;

    private String email;
    private String phone;
    private Boolean isActive;

    private String fullName;
    private String address;
}