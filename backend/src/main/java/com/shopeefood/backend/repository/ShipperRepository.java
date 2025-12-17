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

            // 1. Đếm số đơn (Có lọc ngày)
            "COUNT(CASE WHEN o.status = 'COMPLETED' " +
            "   AND (CAST(:startDate AS timestamp) IS NULL OR o.completedAt >= :startDate) " +
            "   AND (CAST(:endDate AS timestamp) IS NULL OR o.completedAt <= :endDate) " +
            "   THEN 1 ELSE NULL END), " +

            // 2. Tổng thu nhập (Có lọc ngày)
            "SUM(CASE WHEN o.status = 'COMPLETED' " +
            "   AND (CAST(:startDate AS timestamp) IS NULL OR o.completedAt >= :startDate) " +
            "   AND (CAST(:endDate AS timestamp) IS NULL OR o.completedAt <= :endDate) " +
            "   THEN COALESCE(o.shippingFee, 0) ELSE 0 END), " +

            // 3. Đánh giá trung bình (Lấy chung, không cần lọc ngày quá gắt gao hoặc tùy nghiệp vụ)
            "AVG(f.shipperRating), " +

            // 4. MỚI: Tổng thời gian giao hàng (Tính bằng giây rồi chia 60 -> phút) (Có lọc ngày)
            // Lưu ý: EXTRACT(EPOCH FROM ...) là cú pháp PostgreSQL. Nếu dùng MySQL dùng TIMESTAMPDIFF(SECOND, ...)
            // Dưới đây là JPQL chuẩn, nhưng tính toán thời gian thường phụ thuộc DB.
            // Giải pháp an toàn nhất: SUM số giây chênh lệch
            "SUM(CASE WHEN o.status = 'COMPLETED' " +
            "   AND (CAST(:startDate AS timestamp) IS NULL OR o.completedAt >= :startDate) " +
            "   AND (CAST(:endDate AS timestamp) IS NULL OR o.completedAt <= :endDate) " +
            "   THEN (EXTRACT(EPOCH FROM o.completedAt) - EXTRACT(EPOCH FROM o.shippedAt)) ELSE 0 END) " +
            ") " +

            "FROM Shipper s " +
            "JOIN s.account a " +
            "LEFT JOIN Order o ON o.shipper.accountId = s.accountId " + // Bỏ điều kiện AND o.status='COMPLETED' ở đây để filter trong SELECT
            "LEFT JOIN Feedback f ON f.order.id = o.id " +
            "WHERE (:keyword IS NULL OR LOWER(s.fullName) LIKE %:keyword% OR s.account.phone LIKE %:keyword%) " +
            "AND (:status IS NULL OR s.account.isActive = :status) " +
            "GROUP BY s.accountId, s.fullName, s.account.phone, s.account.email, s.account.isActive")
    List<ShipperPerformanceDTO> getShipperPerformance(
            @Param("keyword") String keyword,
            @Param("status") Boolean status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    // ... (Giữ nguyên hàm findShipperHistoryOrders)
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