package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.CustomerAnalyticsDTO;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.OrderItem;
import com.shopeefood.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderAnalyticsService {

    @Autowired
    private OrderRepository orderRepository;

    public CustomerAnalyticsDTO getCustomerStats(Integer customerId, LocalDateTime start, LocalDateTime end) {
        // 1. Lấy danh sách đơn hàng đã hoàn thành trong khoảng thời gian
        List<Order> orders = orderRepository.findOrdersByCustomerAndDateRange(customerId, start, end);

        if (orders.isEmpty()) {
            return new CustomerAnalyticsDTO(
                    new CustomerAnalyticsDTO.Summary(BigDecimal.ZERO, 0L, BigDecimal.ZERO),
                    Collections.emptyList(),
                    Collections.emptyList());
        }

        // 2. Tính toán Summary
        BigDecimal totalSpent = orders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Long count = (long) orders.size();
        BigDecimal avg = totalSpent.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);

        // 3. Xử lý biểu đồ đường (Trend) - Nhóm theo ngày
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        Map<String, BigDecimal> trendMap = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getCreatedAt().format(formatter),
                        TreeMap::new, // Để sắp xếp theo ngày
                        Collectors.mapping(Order::getTotalAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        List<CustomerAnalyticsDTO.ChartPoint> trend = trendMap.entrySet().stream()
                .map(e -> new CustomerAnalyticsDTO.ChartPoint(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        // 4. Xử lý biểu đồ tròn (Categories) - Nhóm theo Category Name
        Map<String, BigDecimal> categoryMap = new HashMap<>();
        for (Order o : orders) {
            for (OrderItem item : o.getOrderItems()) {
                if (item.getProduct() != null && item.getProduct().getCategory() != null) {
                    String catName = item.getProduct().getCategory().getName();
                    BigDecimal itemTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                    categoryMap.put(catName, categoryMap.getOrDefault(catName, BigDecimal.ZERO).add(itemTotal));
                }
            }
        }

        List<CustomerAnalyticsDTO.PiePoint> categories = categoryMap.entrySet().stream()
                .map(e -> new CustomerAnalyticsDTO.PiePoint(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        return new CustomerAnalyticsDTO(new CustomerAnalyticsDTO.Summary(totalSpent, count, avg), trend, categories);
    }
}