package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShipperPerformanceDTO {
    private Integer shipperId;
    private String fullName;
    private String phone;
    private String email;
    private Boolean isActive; // Trạng thái tài khoản (để khóa/mở)

    // Số liệu thống kê
    private Long totalCompletedOrders; // Tổng đơn giao thành công
    private BigDecimal totalIncome;    // Tổng thu nhập (từ shipping_fee)
    private Double averageRating;      // Điểm đánh giá trung bình
    private Double totalDeliveryMinutes;
    // --- SỬA CONSTRUCTOR NÀY ---
    // Hibernate sẽ gọi Constructor này.
    // Chúng ta dùng 'Number' cho income để hứng cả Long lẫn BigDecimal đều không bị lỗi.
    public ShipperPerformanceDTO(Integer shipperId, String fullName, String phone, String email, Boolean isActive,
                                 Long totalCompletedOrders, Number totalIncome, Double averageRating, Number totalSeconds) {
        this.shipperId = shipperId;
        this.fullName = fullName;
        this.phone = phone;
        this.email = email;
        this.isActive = isActive;
        this.totalCompletedOrders = totalCompletedOrders;
        this.totalIncome = (totalIncome != null) ? new BigDecimal(totalIncome.toString()) : BigDecimal.ZERO;
        this.averageRating = (averageRating != null) ? averageRating : 0.0;

        // Convert giây sang phút
        if (totalSeconds != null) {
            this.totalDeliveryMinutes = totalSeconds.doubleValue() / 60.0;
        } else {
            this.totalDeliveryMinutes = 0.0;
        }
    }
}