package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomerAnalyticsDTO {
    private Summary summary;
    private List<ChartPoint> trend;
    private List<PiePoint> categories;

    @Data
    @AllArgsConstructor
    public static class Summary {
        private BigDecimal totalSpent;
        private Long orderCount;
        private BigDecimal avgOrderValue;
    }

    @Data
    @AllArgsConstructor
    public static class ChartPoint {
        private String date;
        private BigDecimal amount;
    }

    @Data
    @AllArgsConstructor
    public static class PiePoint {
        private String name;
        private BigDecimal value;
    }
}