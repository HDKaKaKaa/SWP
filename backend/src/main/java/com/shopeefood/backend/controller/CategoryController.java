package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Category;
import com.shopeefood.backend.entity.CategoryAttribute;
import com.shopeefood.backend.repository.CategoryRepository;
import com.shopeefood.backend.service.ProductService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174" })
public class CategoryController {
    @Autowired
    private ProductService productService;
    @Autowired
    private CategoryRepository categoryRepository;

    // API lấy danh sách tất cả danh mục
    @GetMapping
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // API lấy danh sách attributes theo category ID
    @GetMapping("/{categoryId}/attributes")
    public List<CategoryAttribute> getAttributesByCategory(@PathVariable Integer categoryId) {
        return productService.getAttributesByCategoryId(categoryId);
    }
}