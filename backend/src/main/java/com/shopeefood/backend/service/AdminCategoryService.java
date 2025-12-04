package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.CategoryDTO;
import com.shopeefood.backend.entity.Category;
import com.shopeefood.backend.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminCategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // 1. Lấy tất cả danh mục
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // 2. Tạo mới danh mục
    public Category createCategory(CategoryDTO dto) {
        if (categoryRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Tên danh mục đã tồn tại: " + dto.getName());
        }
        Category category = new Category();
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setImage(dto.getImage());
        return categoryRepository.save(category);
    }

    // 3. Cập nhật danh mục
    public Category updateCategory(Integer id, CategoryDTO dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục ID: " + id));

        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setImage(dto.getImage());

        return categoryRepository.save(category);
    }

    // 4. Xóa danh mục
    public void deleteCategory(Integer id) {
        if (!categoryRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy danh mục để xóa");
        }
        categoryRepository.deleteById(id);
    }
}