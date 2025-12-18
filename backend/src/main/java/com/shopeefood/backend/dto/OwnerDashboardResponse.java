package com.shopeefood.backend.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OwnerDashboardResponse {
    private Stats stats;
    private List<ChartData> chartData;
    private List<BranchComparison> branchComparison;
    private List<TopProduct> topProducts;

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class Stats {
        private BigDecimal totalRevenue;
        private Double revenueGrowth; 
        private Long totalOrders;
        private Double orderGrowth;
        private Long activeProducts;
        private Double avgRating;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ChartData {
        private String date;
        private BigDecimal revenue;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class BranchComparison {
        private String restaurantName;
        private Long orderCount;
        private BigDecimal totalRevenue;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class TopProduct {
        private String name;
        private Long soldCount;
        private BigDecimal revenue;
    }
}