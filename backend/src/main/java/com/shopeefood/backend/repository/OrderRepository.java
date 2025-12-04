package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {
    // Hàm tìm đơn hàng của một khách hàng (Để sau này làm trang Lịch sử đơn hàng)
    List<Order> findByCustomerId(Integer customerId);

    /**
     * 1. Tính TỔNG DOANH THU toàn hệ thống.
     * Chỉ tính những đơn đã hoàn thành (COMPLETED).
     */
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status = 'COMPLETED'")
    BigDecimal sumTotalRevenue();

    /**
     * 2. Đếm SỐ ĐƠN HÀNG trong một khoảng thời gian.
     * Dùng để đếm đơn hôm nay (truyền vào StartOfToday và EndOfToday).
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt BETWEEN :start AND :end")
    Long countOrdersByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 3. Lấy dữ liệu biểu đồ doanh thu 7 ngày gần nhất.
     * Sử dụng NATIVE QUERY để dùng hàm DATE() và GROUP BY của MySQL dễ dàng hơn.
     * Trả về List<Object[]> gồm: [0] là Ngày (Date), [1] là Tổng tiền (Decimal).
     */
    @Query(value = "SELECT DATE(created_at) as label, SUM(total_amount) as value " +
            "FROM orders " +
            "WHERE status = 'COMPLETED' AND created_at >= :startDate " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY DATE(created_at) ASC",
            nativeQuery = true)
    List<Object[]> getRevenueLast7DaysRaw(@Param("startDate") LocalDateTime startDate);

    // Tham số startDate và endDate là LocalDateTime
    @Query("SELECT o FROM Order o WHERE " +
            "(:status IS NULL OR o.status = :status) AND " +
            "(:startDate IS NULL OR o.createdAt >= :startDate) AND " +
            "(:endDate IS NULL OR o.createdAt <= :endDate) " +
            "ORDER BY o.createdAt DESC")
    List<Order> findOrders(
            @Param("status") String status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    // Tìm đơn hàng trạng thái "CART" (giỏ hàng) của 1 khách
    Optional<Order> findFirstByCustomerIdAndStatus(Integer customerId, String status);

    // Tìm đơn hàng "CART" theo khách + nhà hàng (nếu sau này cần)
    Optional<Order> findFirstByCustomerIdAndRestaurantIdAndStatus(
            Integer customerId,
            Integer restaurantId,
            String status
    );
}
