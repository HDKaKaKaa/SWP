package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Restaurant;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Integer> {
    List<Restaurant> findByOwnerId(Integer ownerId);

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

    /**
     * Đếm số nhà hàng đang hoạt động (Status = ACTIVE).
     * Không đếm các quán đang chờ duyệt (PENDING) hoặc bị khóa (BLOCKED).
     */
    @Query("SELECT COUNT(r) FROM Restaurant r WHERE r.status = 'ACTIVE'")
    Long countActiveRestaurants();

    /**
     * Lấy danh sách quán theo danh sách chủ quán (owner account id).
     * Dùng cho màn admin quản lý chủ nhà hàng.
     */
    List<Restaurant> findByOwnerAccountIdIn(List<Integer> ownerAccountIds);
}