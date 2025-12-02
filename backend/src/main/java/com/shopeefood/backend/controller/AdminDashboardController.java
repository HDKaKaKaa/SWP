package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.AdminDashboardStatsDTO;
import com.shopeefood.backend.dto.ChartDataDTO;
import com.shopeefood.backend.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
