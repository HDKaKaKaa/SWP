package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TopCustomerDTO {
    private String fullName;
    private String phone;
    private Long totalOrders; // Số lượng đơn hàng
    private BigDecimal totalSpent; // Tổng chi tiêu
}