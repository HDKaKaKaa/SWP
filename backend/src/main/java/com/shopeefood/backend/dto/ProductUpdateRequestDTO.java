package com.shopeefood.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductUpdateRequestDTO {
    private Integer id; 
    private String name;
    private String description;
    private BigDecimal price; 
    private Boolean isAvailable; 
    private Integer categoryId; 
    private Integer restaurantId;


    private List<ProductDetailRequest> productDetails;
}