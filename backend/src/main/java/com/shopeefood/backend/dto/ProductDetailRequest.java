package com.shopeefood.backend.dto;

import java.math.BigDecimal;
import lombok.Data; 

@Data 
public class ProductDetailRequest {
    private Integer id; 
    private String value;
    private BigDecimal priceAdjustment;
    private Integer attributeId; 
}