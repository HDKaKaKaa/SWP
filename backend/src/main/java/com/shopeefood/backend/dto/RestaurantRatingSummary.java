package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantRatingSummary {
    private Integer restaurantId;
    private Double averageRating;
    private Long totalReviews;
}