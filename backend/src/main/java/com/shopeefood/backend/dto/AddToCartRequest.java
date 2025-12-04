package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class AddToCartRequest {
    private Integer accountId;    // account_id của customer (đã có sẵn trong hệ thống)
    private Integer restaurantId; // quán đang đặt
    private Integer productId;    // món
    private Integer quantity;     // số lượng (>=1)
}
