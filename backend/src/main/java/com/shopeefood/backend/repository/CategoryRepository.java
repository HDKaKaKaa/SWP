package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    // Kiểm tra xem tên danh mục đã tồn tại chưa
    boolean existsByName(String name);
}