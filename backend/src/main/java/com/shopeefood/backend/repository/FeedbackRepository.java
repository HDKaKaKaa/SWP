package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Integer> {
    List<Feedback> findByRestaurantId(Integer restaurantId);

    // Tính rating trung bình của nhà hàng
    @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.restaurant.id = :restaurantId")
    Double getAverageRating(@Param("restaurantId") Integer restaurantId);

    // Kiểm tra xem đơn hàng đã có feedback chưa
    Optional<Feedback> findByOrderId(Integer orderId);

}