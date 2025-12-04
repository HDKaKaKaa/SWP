package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminDashboardStatsDTO {
    private BigDecimal totalRevenue;       // Tổng doanh thu
    private Long todayOrders;              // Số đơn hôm nay
    private Long totalActiveRestaurants;   // Số quán đang hoạt động
    private Long totalOnlineShippers;      // Số shipper đang online
}
