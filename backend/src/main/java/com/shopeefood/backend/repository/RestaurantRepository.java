package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Restaurant.RestaurantStatus;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDateTime;

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

        List<Restaurant> findByStatus(RestaurantStatus status);

        List<Restaurant> findByNameContainingAndStatus(String keyword, RestaurantStatus status);

        // Tìm kiếm quán (Chỉ ACTIVE hoặc BLOCKED) theo từ khóa
        @Query("SELECT r FROM Restaurant r WHERE " +
                        "(r.status = 'ACTIVE' OR r.status = 'BLOCKED') " + // <--- CHỈ LẤY 2 TRẠNG THÁI NÀY
                        "AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                        "OR LOWER(r.owner.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                        "OR LOWER(r.address) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        List<Restaurant> searchForAdmin(String keyword);

        // Lấy tất cả (Chỉ ACTIVE hoặc BLOCKED) khi không có keyword
        @Query("SELECT r FROM Restaurant r WHERE r.status = 'ACTIVE' OR r.status = 'BLOCKED'")
        List<Restaurant> findAllManaged();

        // QUERY TỔNG HỢP: Tìm theo danh sách trạng thái VÀ từ khóa
        @Query("SELECT r FROM Restaurant r WHERE " +
                        "r.status IN :statuses " + // <--- Lọc theo danh sách status truyền vào
                        "AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                        "OR LOWER(r.owner.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                        "OR LOWER(r.address) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        List<Restaurant> findByStatusesAndKeyword(
                        @Param("statuses") List<Restaurant.RestaurantStatus> statuses,
                        @Param("keyword") String keyword);

        List<Restaurant> findByStatusAndCreatedAtBetween(
                        Restaurant.RestaurantStatus status,
                        LocalDateTime start,
                        LocalDateTime end);

    // Tìm nhà hàng theo tên để hiển thị trong Dropdown filter
    List<Restaurant> findByNameContainingIgnoreCase(String keyword);
}