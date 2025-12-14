package com.shopeefood.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Dùng cho modal xem chi tiết Owner: hiển thị thông tin quán của chủ quán.
 */
@Data
public class AdminRestaurantBriefDTO {
    private Integer id;
    private String name;
    private String address;
    private String phone;
    private String status;
    private String coverImage;

    private String description;
    private Double latitude;
    private Double longitude;
    private LocalDateTime createdAt;
}
