package com.shopeefood.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
public class ShipperOrderHistoryDTO {
    private Integer orderId;
    private LocalDateTime shippedAt;
    private LocalDateTime completedAt;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;

    // Thông tin Quán & Khách
    private String restaurantName;
    private String restaurantAddress;
    private String customerName;
    private String customerPhone;

    // Đánh giá dành riêng cho Shipper
    private Integer shipperRating;
    private String shipperComment;

    // Danh sách món ăn
    private List<ShipperHistoryItemDTO> items;
}