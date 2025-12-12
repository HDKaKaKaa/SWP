package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.CategoryAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoryAttributeRepository extends JpaRepository<CategoryAttribute, Integer> {
    List<CategoryAttribute> findByCategory_Id(Integer categoryId);
}