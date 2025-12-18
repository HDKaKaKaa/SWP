package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    // Kiểm tra xem tên danh mục đã tồn tại chưa
    boolean existsByName(String name);

    // 1. Check trùng tên (Case Insensitive - Không phân biệt hoa thường)
    // VD: "Trà sữa" và "TRÀ SỮA" coi là giống nhau
    boolean existsByNameIgnoreCase(String name);

    // 2. Check trùng khi Update (Trừ chính ID hiện tại ra)
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);

    // 3. Tìm kiếm theo Tên danh mục HOẶC Tên thuộc tính
    // Sử dụng DISTINCT để tránh lặp danh mục nếu nó khớp nhiều thuộc tính
    @Query("SELECT DISTINCT c FROM Category c " +
            "LEFT JOIN c.attributes a " +
            "WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Category> searchByKeyword(@Param("keyword") String keyword);
}