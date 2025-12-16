package com.shopeefood.backend.dto;

import lombok.Data;

/**
 * Body FE gửi lên khi customer cập nhật tài khoản
 */
@Data
public class CustomerProfileUpdateRequest {

    private String fullName;

    private String email;
    private String phone;

    private String image;

    private String address;
    private Double latitude;
    private Double longitude;
}

