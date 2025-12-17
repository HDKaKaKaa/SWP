package com.shopeefood.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.shopeefood.backend.dto.RestaurantRatingSummary;
import com.shopeefood.backend.entity.Feedback;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Integer> {
        List<Feedback> findByRestaurantId(Integer restaurantId);

        // Tính rating trung bình của nhà hàng
        @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.restaurant.id = :restaurantId")
        Double getAverageRating(@Param("restaurantId") Integer restaurantId);

        // Kiểm tra xem đơn hàng đã có feedback chưa
        @Query("SELECT f FROM Feedback f WHERE f.order.id = :orderId")
        Optional<Feedback> findByOrderId(@Param("orderId") Integer orderId);

        // --- MỚI: Tìm tất cả feedback nằm trong danh sách orderId (Tối ưu performance)
        // ---
        List<Feedback> findByOrderIdIn(List<Integer> orderIds);

        // Đếm tổng số feedback của quán
        Long countByRestaurantId(Integer restaurantId);

        @Query("""
                        SELECT
                            f.restaurant.id,
                            AVG(f.rating),
                            COUNT(f.id)
                        FROM Feedback f
                        WHERE f.restaurant.id IN :restaurantIds
                        GROUP BY f.restaurant.id
                        """)
        List<Object[]> findAverageRatingAndCountByRestaurantIds(@Param("restaurantIds") List<Integer> restaurantIds);

        // Tải rating và tổng số reviews cho nhiều nhà hàng cùng lúc
        @Query("""
                        SELECT
                            new com.shopeefood.backend.dto.RestaurantRatingSummary(
                                f.restaurant.id,
                                AVG(f.rating),
                                COUNT(f.id))
                        FROM Feedback f
                        WHERE f.restaurant.id IN :restaurantIds
                        GROUP BY f.restaurant.id
                        """)
        List<RestaurantRatingSummary> findRatingSummariesByRestaurantIds(
                        @Param("restaurantIds") List<Integer> restaurantIds);

        @Query(value = """
                        SELECT
                            f.*,
                            f.created_at AS feedbackCreatedAt,
                            f.rating AS feedbackRating,
                            ord.id AS orderIdCol,
                            ord.order_number AS orderNumberCol
                        FROM feedbacks f
                        JOIN restaurants r ON r.id = f.restaurant_id
                        JOIN owners o ON o.account_id = r.owner_id
                        LEFT JOIN customers c ON c.account_id = f.customer_id
                        LEFT JOIN orders ord ON ord.id = f.order_id
                        WHERE o.account_id = :ownerId
                        AND ( CAST(:restaurantId AS INTEGER) IS NULL OR r.id = :restaurantId )
                          AND ( CAST(:searchKeyword AS TEXT) IS NULL
                            OR LOWER(CAST(f.comment AS TEXT)) LIKE LOWER(CONCAT('%', CAST(:searchKeyword AS TEXT), '%'))
                            OR LOWER(CAST(c.full_name AS VARCHAR)) LIKE LOWER(CONCAT('%', CAST(:searchKeyword AS VARCHAR), '%'))
                            OR LOWER(ord.order_number) LIKE LOWER(CONCAT('%', CAST(:searchKeyword AS VARCHAR), '%'))
                          )
                        AND ( CAST(:fromDate AS TIMESTAMP) IS NULL OR f.created_at >= :fromDate )
                        AND ( CAST(:toDate AS TIMESTAMP) IS NULL OR f.created_at <= :toDate )
                        """, nativeQuery = true)
        Page<Feedback> findFilteredFeedbacksByOwner(
                        @Param("ownerId") Integer ownerId,
                        @Param("restaurantId") Integer restaurantId,
                        @Param("searchKeyword") String searchKeyword,
                        @Param("fromDate") LocalDateTime fromDate,
                        @Param("toDate") LocalDateTime toDate,
                        Pageable pageable);

        Optional<Feedback> findByIdAndRestaurantOwnerAccountId(Integer feedbackId, Integer ownerAccountId);
};