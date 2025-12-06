package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class UpdateItemQuantityRequest {
    private Integer accountId;
    private Integer itemId;    // OrderItem.id
    private Integer quantity;  // new quantity
}
