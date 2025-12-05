package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable; 
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    // Tìm món theo Category ID
    List<Product> findByCategoryId(Integer categoryId);

    // Tìm món theo Restaurant ID
    List<Product> findByRestaurantId(Integer restaurantId);

    // Tìm món theo Owner ID với phân trang, tìm kiếm và lọc
    @Query("SELECT p FROM Product p JOIN p.restaurant r WHERE r.owner.id = :ownerId " +
           "AND (:restaurantId IS NULL OR p.restaurant.id = :restaurantId) " +
           "AND (:search IS NULL OR p.name LIKE %:search%)") // ⭐ Thêm điều kiện tìm kiếm và lọc
    Page<Product> findProductsByOwnerIdAndFilters(
        @Param("ownerId") Integer ownerId,
        @Param("restaurantId") Integer restaurantId,
        @Param("search") String search,
        Pageable pageable
    );
}