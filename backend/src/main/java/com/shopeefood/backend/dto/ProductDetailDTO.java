package com.shopeefood.backend.dto;

import java.math.BigDecimal;

import com.shopeefood.backend.entity.ProductDetail;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ProductDetailDTO {
    private Integer id;
    private String attributeName;
    private String value;
    private BigDecimal priceAdjustment;
    private Integer attributeId; 

    public ProductDetailDTO(ProductDetail detail) {
        this.id = detail.getId();
        this.value = detail.getValue();
        this.priceAdjustment = detail.getPriceAdjustment();

        if (detail.getAttribute() != null) {
            this.attributeName = detail.getAttribute().getName();
            this.attributeId = detail.getAttribute().getId(); // Lấy ID
        }
        
    }
}
