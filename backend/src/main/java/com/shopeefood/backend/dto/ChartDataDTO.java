package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChartDataDTO {
    private String label;      // Nhãn (VD: Ngày 2023-10-25)
    private BigDecimal value;  // Giá trị (VD: Doanh thu)
}
