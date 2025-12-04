package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    // Tìm món theo Category ID
    List<Product> findByCategoryId(Integer categoryId);

    // Tìm món theo Restaurant ID
    List<Product> findByRestaurantId(Integer restaurantId);
}