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

import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Restaurant.RestaurantStatus;

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

        @Query("SELECT DISTINCT r FROM Restaurant r " +
                        "LEFT JOIN r.products p " + // Join sang bảng Product
                        "LEFT JOIN p.category c " + // Join sang bảng Category
                        "LEFT JOIN p.details d " + // Join sang bảng ProductDetail (dựa vào biến 'details' trong
                                                   // Product)
                        "WHERE r.status = :status " + // Chỉ lấy quán đang ACTIVE
                        "AND (" +
                        "   LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " + // Tìm tên quán
                        "   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " + // Tìm tên món
                        "   OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " + // Tìm tên danh mục
                        "   OR LOWER(d.value) LIKE LOWER(CONCAT('%', :keyword, '%')) " + // Tìm tên Option (dựa vào biến
                                                                                         // 'value' trong ProductDetail)
                        ")")
        Page<Restaurant> searchGlobal(
                        @Param("keyword") String keyword,
                        @Param("status") RestaurantStatus status,
                        Pageable pageable);

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

        List<Restaurant> findByOwnerAccountId(Integer ownerAccountId);

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
        @Query("SELECT r FROM Restaurant r WHERE r.status = 'ACTIVE' OR r.status = 'BLOCKED' OR r.status = 'CLOSE'")
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

        Optional<Restaurant> findByIdAndOwnerAccountId(Integer id, Integer ownerAccountId);

        Optional<Restaurant> findByIdAndOwnerId(Integer id, Integer ownerId);

        @Query("SELECT r FROM Restaurant r WHERE r.status = 'PENDING' " +
                        "AND (:keyword IS NULL OR LOWER(CAST(r.name AS text)) LIKE :keyword) " +
                        "AND (CAST(:start AS timestamp) IS NULL OR r.createdAt >= :start) " +
                        "AND (CAST(:end AS timestamp) IS NULL OR r.createdAt <= :end) " +
                        "ORDER BY r.createdAt DESC")
        List<Restaurant> findPendingRestaurants(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("keyword") String keyword);

        // Tìm tất cả quán ACTIVE có phân trang
        Page<Restaurant> findByStatus(RestaurantStatus status, Pageable pageable);

        // Tìm kiếm theo tên và ACTIVE có phân trang
        Page<Restaurant> findByNameContainingAndStatus(String keyword, RestaurantStatus status, Pageable pageable);

        /**
         * TÌM KIẾM NÂNG CAO (NATIVE QUERY):
         * 1. Tìm theo keyword (Tên quán, Món, Danh mục, Option)
         * 2. Tính khoảng cách (Distance) từ User đến Quán
         * 3. Sắp xếp (Sort) theo: Mới nhất, Gần nhất, Rating cao nhất
         */
        @Query(value = "SELECT r.* " + // <--- BỎ TỪ KHÓA DISTINCT Ở ĐÂY
                        "FROM restaurants r " +
                        "LEFT JOIN products p ON r.id = p.restaurant_id " +
                        "LEFT JOIN categories c ON p.category_id = c.id " +
                        "LEFT JOIN product_details d ON p.id = d.product_id " +
                        "WHERE r.status = :status " +
                        "AND (:keyword IS NULL OR :keyword = '' OR " +
                        "    LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "    LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "    LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "    LOWER(d.value) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +

                        "GROUP BY r.id " + // <--- THÊM DÒNG NÀY (Gom nhóm theo ID quán để loại bỏ trùng lặp)

                        "ORDER BY " +
                        "   CASE WHEN :sortBy = 'rating' THEN (SELECT COALESCE(AVG(f.rating), 0) FROM feedbacks f WHERE f.restaurant_id = r.id) END DESC, "
                        +
                        "   CASE WHEN :sortBy = 'distance' THEN (6371 * acos(cos(radians(:userLat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(:userLng)) + sin(radians(:userLat)) * sin(radians(r.latitude)))) END ASC, "
                        +
                        "   r.created_at DESC ",

                        // Count query vẫn giữ DISTINCT r.id vì nó chỉ đếm số lượng, không order by
                        countQuery = "SELECT COUNT(DISTINCT r.id) FROM restaurants r " +
                                        "LEFT JOIN products p ON r.id = p.restaurant_id " +
                                        "LEFT JOIN categories c ON p.category_id = c.id " +
                                        "LEFT JOIN product_details d ON p.id = d.product_id " +
                                        "WHERE r.status = :status " +
                                        "AND (:keyword IS NULL OR :keyword = '' OR " +
                                        "    LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                                        "    LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                                        "    LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                                        "    LOWER(d.value) LIKE LOWER(CONCAT('%', :keyword, '%'))) ", nativeQuery = true)
        Page<Restaurant> searchRestaurantsAdvanced(
                        @Param("keyword") String keyword,
                        @Param("status") String status,
                        @Param("userLat") Double userLat,
                        @Param("userLng") Double userLng,
                        @Param("sortBy") String sortBy,
                        Pageable pageable);
}