package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class IssueCreateRequest {
    private Integer accountId;

    private Integer orderId;

    private String targetType;   // ORDER/RESTAURANT/SHIPPER/OTHER
    private Integer targetId;
    private String targetNote;

    private String category;     // FOOD/ITEM/.../OTHER
    private String otherCategory;

    private String title;
    private String description;
}
