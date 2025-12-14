package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.AdminDashboardStatsDTO;
import com.shopeefood.backend.dto.ChartDataDTO;
import com.shopeefood.backend.dto.RevenueAnalysisDTO;
import com.shopeefood.backend.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard") // Endpoint riêng cho Admin
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService dashboardService;

    // API 1: Lấy 4 chỉ số thống kê
    // GET: http://localhost:8080/api/admin/dashboard/stats
    @GetMapping("/stats")
    public ResponseEntity<AdminDashboardStatsDTO> getStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }

    // API 2: Lấy dữ liệu vẽ biểu đồ
    // GET: http://localhost:8080/api/admin/dashboard/chart
    @GetMapping("/chart")
    public ResponseEntity<List<ChartDataDTO>> getChart() {
        return ResponseEntity.ok(dashboardService.getRevenueChartData());
    }

    // API 3: Phân tích doanh thu (Có Filter)
    // GET /api/admin/dashboard/revenue-analysis?startDate=...&endDate=...&restaurantId=...
    @GetMapping("/revenue-analysis")
    public ResponseEntity<RevenueAnalysisDTO> getRevenueAnalysis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer restaurantId
    ) {
        return ResponseEntity.ok(dashboardService.analyzeRevenue(startDate, endDate, restaurantId));
    }

    // API 4: Tìm nhà hàng cho Dropdown Select
    @GetMapping("/restaurants-search")
    public ResponseEntity<?> searchRestaurants(@RequestParam(defaultValue = "") String keyword) {
        // Trả về list object gọn nhẹ chỉ cần id và name
        var list = dashboardService.searchRestaurants(keyword).stream().map(r -> {
            return Map.of("id", r.getId(), "name", r.getName());
        }).toList();
        return ResponseEntity.ok(list);
    }
}
