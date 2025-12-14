package com.shopeefood.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RevenueAnalysisDTO {
    private BigDecimal totalPeriodRevenue; // Tổng tiền trong khoảng thời gian chọn
    private List<ChartDataDTO> chartData;  // Dữ liệu từng ngày để vẽ biểu đồ
}