package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class RestaurantLandingDTO {
    private Integer id;
    private String name;
    private String address;
    private String coverImage;
    private Double averageRating;
    private Long totalReviews;
    private Integer ownerAccountId;
    private Double distance;
}