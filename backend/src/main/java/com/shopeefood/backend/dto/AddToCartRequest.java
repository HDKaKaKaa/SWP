package com.shopeefood.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class AddToCartRequest {
    private Integer accountId; 
    private Integer restaurantId; 
    private Integer productId;  
    private Integer quantity;

    // Danh sách ID của ProductDetail (options) được chọn cho món này
    private List<Integer> detailIds;
}
