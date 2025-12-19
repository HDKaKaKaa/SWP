package com.shopeefood.backend.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.shopeefood.backend.entity.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    // Tìm món theo Category ID
    List<Product> findByCategoryId(Integer categoryId);

    // Tìm món theo Restaurant ID
    List<Product> findByRestaurantId(Integer restaurantId);

    // Tìm món theo Owner ID với phân trang, tìm kiếm và lọc
    @EntityGraph(attributePaths = {"restaurant", "category", "details", "details.attribute"}) // Thêm details ở đây
    @Query("SELECT p FROM Product p JOIN p.restaurant r WHERE r.owner.id = :ownerId " +
           "AND (:restaurantId IS NULL OR p.restaurant.id = :restaurantId) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:isAvailable IS NULL OR p.isAvailable = :isAvailable) " +
           "AND (:search IS NULL OR p.name LIKE %:search%)") 
    Page<Product> findProductsByOwnerIdAndFilters(
        @Param("ownerId") Integer ownerId,
        @Param("restaurantId") Integer restaurantId,
        @Param("categoryId") Integer categoryId,
        @Param("isAvailable") Boolean isAvailable,
        @Param("search") String search,
        Pageable pageable
    );

    // Thêm 2 hàm mới
    // Dùng cho màn CHỌN MÓN & CHỈNH SỬA MÓN
    @EntityGraph(attributePaths = {"details", "details.attribute"})
    @Query("SELECT p FROM Product p WHERE p.restaurant.id = :restaurantId")
    List<Product> findByRestaurantIdWithDetails(@Param("restaurantId") Integer restaurantId);

    @EntityGraph(attributePaths = {"details", "details.attribute"})
    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId")
    List<Product> findByCategoryIdWithDetails(@Param("categoryId") Integer categoryId);
}