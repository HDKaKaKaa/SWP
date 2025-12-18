package com.shopeefood.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.shopeefood.backend.dto.OwnerDashboardResponse;
import com.shopeefood.backend.repository.OwnerDashboardRepository;

@Service
public class OwnerDashboardService {

    @Autowired 
    private OwnerDashboardRepository ownerDashboardRepository;

    public OwnerDashboardResponse getFullDashboardData(Integer ownerId, Integer restaurantId, String startStr, String endStr) {
        // Chuyển String thành LocalDateTime để Postgres không báo lỗi operator
        LocalDate startDate = LocalDate.parse(startStr);
        LocalDate endDate = LocalDate.parse(endStr);
        
        LocalDateTime start = startDate.atStartOfDay(); // 00:00:00
        LocalDateTime end = endDate.atTime(LocalTime.MAX); // 23:59:59.999

        // 1. Dữ liệu biểu đồ & Top sản phẩm
        List<OwnerDashboardResponse.ChartData> chartData = ownerDashboardRepository.getRevenueByDate(ownerId, restaurantId, start, end)
                .stream().map(obj -> new OwnerDashboardResponse.ChartData(obj[0].toString(), new BigDecimal(obj[1].toString())))
                .collect(Collectors.toList());

        List<OwnerDashboardResponse.TopProduct> topProducts = ownerDashboardRepository.getTopProducts(ownerId, restaurantId, start, end)
                .stream().map(obj -> new OwnerDashboardResponse.TopProduct(obj[0].toString(), 
                        ((Number)obj[1]).longValue(), new BigDecimal(obj[2].toString())))
                .collect(Collectors.toList());

        // 2. Dữ liệu so sánh chi nhánh
        List<OwnerDashboardResponse.BranchComparison> branchComparison = ownerDashboardRepository.getBranchComparison(ownerId, start, end)
                .stream().map(obj -> new OwnerDashboardResponse.BranchComparison(obj[0].toString(), 
                        ((Number)obj[1]).longValue(), obj[2] != null ? new BigDecimal(obj[2].toString()) : BigDecimal.ZERO))
                .collect(Collectors.toList());

        // 3. Tính toán Tăng trưởng (Kỳ trước)
        long daysDiff = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        LocalDateTime prevStart = startDate.minusDays(daysDiff).atStartOfDay();
        LocalDateTime prevEnd = startDate.minusDays(1).atTime(LocalTime.MAX);

        BigDecimal currentRevenue = branchComparison.stream().map(OwnerDashboardResponse.BranchComparison::getTotalRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        long currentOrders = branchComparison.stream().mapToLong(OwnerDashboardResponse.BranchComparison::getOrderCount).sum();

        List<Object[]> prevData = ownerDashboardRepository.getSummaryForGrowth(ownerId, restaurantId, prevStart, prevEnd);
        BigDecimal prevRevenue = (prevData.get(0)[0] != null) ? new BigDecimal(prevData.get(0)[0].toString()) : BigDecimal.ZERO;
        long prevOrders = (prevData.get(0)[1] != null) ? ((Number)prevData.get(0)[1]).longValue() : 0L;

        // 4. Tổng hợp Stats
        OwnerDashboardResponse.Stats stats = new OwnerDashboardResponse.Stats(
                currentRevenue,
                calculateGrowth(currentRevenue, prevRevenue),
                currentOrders,
                calculateGrowth(BigDecimal.valueOf(currentOrders), BigDecimal.valueOf(prevOrders)),
                ownerDashboardRepository.countActiveProducts(ownerId, restaurantId),
                ownerDashboardRepository.getAverageRating(ownerId, restaurantId)
        );

        return new OwnerDashboardResponse(stats, chartData, branchComparison, topProducts);
    }

    private Double calculateGrowth(BigDecimal current, BigDecimal previous) {
        if (previous.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        return current.subtract(previous)
                .divide(previous, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).doubleValue();
    }
}