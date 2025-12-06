package com.shopeefood.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class AddToCartRequest {
    private Integer accountId;    // account_id của customer (đã có sẵn trong hệ thống)
    private Integer restaurantId; // quán đang đặt
    private Integer productId;    // món
    private Integer quantity;     // số lượng (>=1)

    // Danh sách ID của ProductDetail (options) được chọn cho món này
    private List<Integer> detailIds;
}
