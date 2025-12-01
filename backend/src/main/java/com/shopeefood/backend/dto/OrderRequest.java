package com.shopeefood.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
    private Integer accountId; // Ai đặt?
    private Integer restaurantId; // Đặt quán nào?
    private String address; // Giao đi đâu?
    private List<OrderItemRequest> items; // Danh sách món
}