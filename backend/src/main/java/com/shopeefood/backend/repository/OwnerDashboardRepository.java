package com.shopeefood.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.shopeefood.backend.entity.Order;

public interface OwnerDashboardRepository extends JpaRepository<Order, Integer> {

    // 1. Doanh thu theo ngày (Net Revenue = Subtotal - ownerRefundAmount)
    // Bao gồm cả COMPLETED và REFUNDED
    @Query(value = "SELECT DATE(o.created_at) as date, " +
           "SUM(o.subtotal - COALESCE(i.owner_refund_amount, 0)) as revenue " +
           "FROM orders o " +
           "JOIN restaurants r ON o.restaurant_id = r.id " +
           "LEFT JOIN issues i ON o.id = i.order_id " +
           "WHERE r.owner_id = :ownerId " +
           "AND (:resId IS NULL OR o.restaurant_id = :resId) " +
           "AND o.status IN ('COMPLETED', 'REFUNDED') " +
           "AND o.created_at BETWEEN :start AND :end " +
           "GROUP BY DATE(o.created_at) ORDER BY date", nativeQuery = true)
    List<Object[]> getRevenueByDate(@Param("ownerId") Integer ownerId, @Param("resId") Integer resId, 
                                   @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // 2. So sánh chi nhánh: Đếm đơn và tính doanh thu thuần
    @Query(value = "SELECT r.name, COUNT(o.id) as orderCount, " +
           "SUM(COALESCE(o.subtotal, 0) - COALESCE(i.owner_refund_amount, 0)) as revenue " +
           "FROM restaurants r " +
           "LEFT JOIN orders o ON r.id = o.restaurant_id " +
           "AND o.status IN ('COMPLETED', 'REFUNDED') " +
           "AND o.created_at BETWEEN :start AND :end " +
           "LEFT JOIN issues i ON o.id = i.order_id " +
           "WHERE r.owner_id = :ownerId " +
           "GROUP BY r.id, r.name", nativeQuery = true)
    List<Object[]> getBranchComparison(@Param("ownerId") Integer ownerId, 
                                      @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // 3. Top sản phẩm: Dựa trên các đơn COMPLETED/REFUNDED
    @Query(value = "SELECT p.name, SUM(oi.quantity), SUM(oi.price * oi.quantity) " +
           "FROM order_items oi " +
           "JOIN orders o ON oi.order_id = o.id " +
           "JOIN products p ON oi.product_id = p.id " +
           "JOIN restaurants r ON o.restaurant_id = r.id " +
           "WHERE r.owner_id = :ownerId " +
           "AND (:resId IS NULL OR o.restaurant_id = :resId) " +
           "AND o.status IN ('COMPLETED', 'REFUNDED') " +
           "AND o.created_at BETWEEN :start AND :end " +
           "GROUP BY p.id, p.name ORDER BY SUM(oi.quantity) DESC LIMIT 5", nativeQuery = true)
    List<Object[]> getTopProducts(@Param("ownerId") Integer ownerId, @Param("resId") Integer resId, 
                                 @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // 4. Summary để tính tăng trưởng (Tổng doanh thu thuần và tổng đơn)
    @Query(value = "SELECT " +
           "SUM(o.subtotal - COALESCE(i.owner_refund_amount, 0)), " +
           "COUNT(o.id) " +
           "FROM orders o " +
           "JOIN restaurants r ON o.restaurant_id = r.id " +
           "LEFT JOIN issues i ON o.id = i.order_id " +
           "WHERE r.owner_id = :ownerId " +
           "AND (:resId IS NULL OR o.restaurant_id = :resId) " +
           "AND o.status IN ('COMPLETED', 'REFUNDED') " +
           "AND o.created_at BETWEEN :start AND :end", nativeQuery = true)
    List<Object[]> getSummaryForGrowth(@Param("ownerId") Integer ownerId, @Param("resId") Integer resId, 
                                      @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Giữ nguyên các hàm đếm sản phẩm và rating
    @Query(value = "SELECT COUNT(p.id) FROM products p JOIN restaurants r ON p.restaurant_id = r.id " +
           "WHERE r.owner_id = :ownerId AND (:resId IS NULL OR r.id = :resId) AND p.is_available = true", nativeQuery = true)
    Long countActiveProducts(@Param("ownerId") Integer ownerId, @Param("resId") Integer resId);

    @Query(value = "SELECT AVG(f.rating) FROM feedbacks f JOIN restaurants r ON f.restaurant_id = r.id " +
           "WHERE r.owner_id = :ownerId AND (:resId IS NULL OR r.id = :resId)", nativeQuery = true)
    Double getAverageRating(@Param("ownerId") Integer ownerId, @Param("resId") Integer resId);
}