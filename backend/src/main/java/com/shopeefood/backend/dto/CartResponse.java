package com.shopeefood.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CartResponse {
    private Integer orderId;

    private Integer restaurantId;
    private String restaurantName;
    private String restaurantAddress;

    private String shippingAddress;

    private List<CartItemResponse> items;

    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal total;
}
