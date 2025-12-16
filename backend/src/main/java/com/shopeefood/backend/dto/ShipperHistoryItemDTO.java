package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShipperHistoryItemDTO {
    private String productName;
    private Integer quantity;
    private BigDecimal price;
    private String options; // Hiển thị thuộc tính (VD: Size M, 50% Đường...)
    private String note;    // Ghi chú món nếu có
}