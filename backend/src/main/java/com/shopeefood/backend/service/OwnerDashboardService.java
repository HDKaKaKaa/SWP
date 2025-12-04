package com.shopeefood.backend.service;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Feedback;
import com.shopeefood.backend.repository.OrderRepository;
import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.repository.RestaurantRepository;
import com.shopeefood.backend.repository.FeedbackRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.OptionalDouble;

@Service
public class OwnerDashboardService {

    private final RestaurantRepository restaurantRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final FeedbackRepository feedbackRepository;

    public OwnerDashboardService(RestaurantRepository restaurantRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            FeedbackRepository feedbackRepository) {
        this.restaurantRepository = restaurantRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.feedbackRepository = feedbackRepository;
    }

    // Lấy tất cả nhà hàng của owner
    public List<Restaurant> getRestaurantsByOwner(Integer ownerId) {
        return restaurantRepository.findByOwnerId(ownerId);
    }

    // Lấy tất cả sản phẩm theo restaurant
    public List<Product> getProductsByRestaurant(Integer restaurantId) {
        return productRepository.findByRestaurantId(restaurantId);
    }

    // Lấy tất cả đơn hàng theo restaurant
    public List<Order> getOrdersByRestaurant(Integer restaurantId) {
        return orderRepository.findByRestaurantId(restaurantId);
    }

    // Lấy báo cáo nhanh: tổng đơn, tổng doanh thu, rating trung bình
    public DashboardReport getReportByRestaurant(Integer restaurantId) {
        List<Order> orders = getOrdersByRestaurant(restaurantId);
        List<Feedback> feedbacks = feedbackRepository.findByRestaurantId(restaurantId);

        int totalOrders = orders.size();
        double totalRevenue = orders.stream()
                .mapToDouble(order -> order.getTotalAmount().doubleValue())
                .sum();

        OptionalDouble avgRating = feedbacks.stream()
                .mapToDouble(Feedback::getRating)
                .average();

        DashboardReport report = new DashboardReport();
        report.setTotalOrders(totalOrders);
        report.setTotalRevenue(totalRevenue);
        report.setAverageRating(avgRating.isPresent() ? avgRating.getAsDouble() : 0);

        return report;
    }

    // DTO cho báo cáo nhanh
    public static class DashboardReport {
        private int totalOrders;
        private double totalRevenue;
        private double averageRating;

        public int getTotalOrders() {
            return totalOrders;
        }

        public void setTotalOrders(int totalOrders) {
            this.totalOrders = totalOrders;
        }

        public double getTotalRevenue() {
            return totalRevenue;
        }

        public void setTotalRevenue(double totalRevenue) {
            this.totalRevenue = totalRevenue;
        }

        public double getAverageRating() {
            return averageRating;
        }

        public void setAverageRating(double averageRating) {
            this.averageRating = averageRating;
        }
    }
}
