package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Restaurant;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Integer> {

    // Logic: Tìm quán ăn NẾU:
    // 1. Tên quán chứa từ khóa
    // 2. HOẶC Quán có món ăn chứa từ khóa
    // 3. HOẶC Quán có món thuộc danh mục chứa từ khóa
    @Query("SELECT DISTINCT r FROM Restaurant r " +
            "JOIN r.products p " +
            "JOIN p.category c " +
            "WHERE r.name LIKE %:keyword% " +
            "OR p.name LIKE %:keyword% " +
            "OR c.name LIKE %:keyword%")
    List<Restaurant> searchRestaurants(@Param("keyword") String keyword);
}