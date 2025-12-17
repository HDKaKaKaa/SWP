package com.shopeefood.backend.repository;

import com.shopeefood.backend.dto.ShipperPerformanceDTO;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Shipper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShipperRepository extends JpaRepository<Shipper, Integer> {

    /**
     * Đếm số Shipper đang bật ứng dụng (ONLINE).
     */
    @Query("SELECT COUNT(s) FROM Shipper s WHERE s.status = 'ONLINE'")
    Long countOnlineShippers();

    /**
     * Query phức tạp để lấy thống kê:
     * 1. Join Shipper với Account để lấy thông tin cá nhân.
     * 2. Left Join với Orders (chỉ lấy COMPLETED) để đếm số đơn và cộng tiền ship.
     * 3. Left Join với Feedback (qua Order) để tính trung bình cộng rating.
     */
    @Query("SELECT new com.shopeefood.backend.dto.ShipperPerformanceDTO(" +
            "s.accountId, " +
            "s.fullName, " +
            "s.account.phone, " +
            "s.account.email, " +
            "s.account.isActive, " +
            "COUNT(o.id), " +
            "SUM(COALESCE(o.shippingFee, 0)), " +
            "AVG(f.shipperRating)) " +
            "FROM Shipper s " +
            "JOIN s.account a " +
            "LEFT JOIN Order o ON o.shipper.accountId = s.accountId AND o.status = 'COMPLETED' " +
            "LEFT JOIN Feedback f ON f.order.id = o.id " +
            "WHERE (:keyword IS NULL OR LOWER(s.fullName) LIKE %:keyword% OR s.account.phone LIKE %:keyword%) " +
            "AND (:status IS NULL OR s.account.isActive = :status) " +
            "GROUP BY s.accountId, s.fullName, s.account.phone, s.account.email, s.account.isActive")
    List<ShipperPerformanceDTO> getShipperPerformance(
            @Param("keyword") String keyword,
            @Param("status") Boolean status
    );

    // QUERY MỚI: Lấy Entity Order kèm theo các quan hệ cần thiết
    // Sử dụng LEFT JOIN FETCH để lấy OrderItems và Product trong 1 lần query
    @Query("SELECT DISTINCT o FROM Order o " +
            "JOIN FETCH o.restaurant r " +
            "JOIN FETCH o.customer c_acc " +
            "LEFT JOIN FETCH o.orderItems oi " +
            "LEFT JOIN FETCH oi.product p " +
            "WHERE o.shipper.accountId = :shipperId " +
            "AND o.status = 'COMPLETED' " +
            "AND (CAST(:startDate AS timestamp) IS NULL OR o.completedAt >= :startDate) " +
            "AND (CAST(:endDate AS timestamp) IS NULL OR o.completedAt <= :endDate) " +
            "ORDER BY o.completedAt DESC")
    List<Order> findShipperHistoryOrders(
            @Param("shipperId") Integer shipperId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

}