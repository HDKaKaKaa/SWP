package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class UpdateCartItemRequest {
    private Integer accountId;
    private Integer productId;
    private Integer quantity; // nếu <=0 thì coi như xoá món
}
