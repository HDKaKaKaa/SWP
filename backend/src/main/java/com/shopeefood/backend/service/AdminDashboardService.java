package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.AdminDashboardStatsDTO;

import com.shopeefood.backend.dto.ChartDataDTO;
import com.shopeefood.backend.dto.RevenueAnalysisDTO;
import com.shopeefood.backend.dto.TopCustomerDTO;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.OrderRepository;
import com.shopeefood.backend.repository.RestaurantRepository;
import com.shopeefood.backend.repository.ShipperRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminDashboardService {

    @Autowired private OrderRepository orderRepository;
    @Autowired private RestaurantRepository restaurantRepository;
    @Autowired private ShipperRepository shipperRepository;

    // 1. Lấy số liệu tổng quan (Stats Cards)
    public AdminDashboardStatsDTO getDashboardStats() {
        // Doanh thu toàn sàn (chỉ tính đơn COMPLETED)
        BigDecimal totalRevenue = orderRepository.sumTotalRevenue();
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        // Số đơn hôm nay
        LocalDateTime startToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endToday = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        Long todayOrders = orderRepository.countOrdersByDateRange(startToday, endToday);

        // Số quán đang hoạt động
        Long activeRestaurants = restaurantRepository.countActiveRestaurants();

        // Số shipper đang online
        Long onlineShippers = shipperRepository.countOnlineShippers();

        return new AdminDashboardStatsDTO(totalRevenue, todayOrders, activeRestaurants, onlineShippers);
    }

    // 2. Lấy dữ liệu biểu đồ doanh thu 7 ngày gần nhất
    public List<ChartDataDTO> getRevenueChartData() {
        // Lấy mốc thời gian 7 ngày trước
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        // Gọi Repo lấy dữ liệu thô (List Object[])
        List<Object[]> rawData = orderRepository.getRevenueLast7DaysRaw(sevenDaysAgo);

        // Chuyển List Object[] thành Map để dễ tra cứu. Key = Ngày (String), Value = Tiền
        Map<String, BigDecimal> dataMap = rawData.stream().collect(Collectors.toMap(
                row -> row[0].toString(),       // Date string
                row -> (BigDecimal) row[1]      // Total amount
        ));

        // Tạo List kết quả đầy đủ cho 7 ngày (kể cả ngày ko có đơn cũng phải hiện số 0)
        List<ChartDataDTO> result = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String key = date.format(formatter);

            // Nếu ngày đó có doanh thu thì lấy, không thì gán 0
            BigDecimal value = dataMap.getOrDefault(key, BigDecimal.ZERO);
            result.add(new ChartDataDTO(key, value));
        }

        return result;
    }

    // 3. API Phân tích doanh thu (Filter)
    public RevenueAnalysisDTO analyzeRevenue(LocalDate fromDate, LocalDate toDate, Integer restaurantId) {
        // 1. Xử lý ngày mặc định: Nếu null thì lấy 7 ngày gần nhất
        if (fromDate == null || toDate == null) {
            toDate = LocalDate.now();
            fromDate = toDate.minusDays(6); // 7 ngày (tính cả hôm nay)
        }

        // Chuyển sang LocalDateTime để query DB
        LocalDateTime startDateTime = fromDate.atStartOfDay();
        LocalDateTime endDateTime = toDate.atTime(LocalTime.MAX);

        // 2. Gọi Repo lấy dữ liệu thô
        List<Object[]> rawData = orderRepository.getRevenueByFilter(startDateTime, endDateTime, restaurantId);

        // 3. Convert List Object[] sang Map<String, BigDecimal> để dễ xử lý
        Map<String, BigDecimal> dataMap = rawData.stream().collect(Collectors.toMap(
                row -> row[0].toString(),       // Key: 2023-10-25
                row -> (BigDecimal) row[1]      // Value: 500000
        ));

        // 4. Tạo List kết quả đầy đủ (Lấp đầy những ngày không có đơn bằng số 0)
        List<ChartDataDTO> chartData = new ArrayList<>();
        BigDecimal totalPeriodRevenue = BigDecimal.ZERO;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Duyệt từ ngày bắt đầu đến ngày kết thúc
        LocalDate current = fromDate;
        while (!current.isAfter(toDate)) {
            String key = current.format(formatter);
            BigDecimal value = dataMap.getOrDefault(key, BigDecimal.ZERO);

            chartData.add(new ChartDataDTO(key, value));
            totalPeriodRevenue = totalPeriodRevenue.add(value); // Cộng dồn tổng

            current = current.plusDays(1); // Tăng 1 ngày
        }

        return new RevenueAnalysisDTO(totalPeriodRevenue, chartData);
    }

    // 4. Tìm nhà hàng cho Dropdown
    public List<Restaurant> searchRestaurants(String keyword) {
        return restaurantRepository.findByNameContainingIgnoreCase(keyword);
    }
    // 5. Lấy Top 3 Khách hàng
    public List<TopCustomerDTO> getTop3Customers() {
        return orderRepository.findTop3Spenders(PageRequest.of(0, 3));
    }
}
