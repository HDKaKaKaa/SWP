package com.shopeefood.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CartItemResponse {

    private Integer itemId;

    private Integer productId;
    private String productName;
    private String productImage;

    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal lineTotal;

    private List<CartItemOptionDTO> options;
}
