package com.shopeefood.backend.dto;

import lombok.Data;

/**
 * Dùng để trả dữ liệu ra FE ở màn hồ sơ khách hàng
 */
@Data
public class CustomerProfileResponse {

    private Integer accountId;
    private String username;
    private String role;

    private String email;
    private String phone;

    private String fullName;
    private String address;
    private Double latitude;
    private Double longitude;
}
