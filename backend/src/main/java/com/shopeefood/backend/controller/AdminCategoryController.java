package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.CategoryDTO;
import com.shopeefood.backend.entity.Category;
import com.shopeefood.backend.service.AdminCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
public class AdminCategoryController {

    @Autowired
    private AdminCategoryService categoryService;

    // GET: Lấy danh sách
    @GetMapping
    public ResponseEntity<List<Category>> getAll() {
        // Trả về Entity list, nhưng Attribute đã có @JsonIgnore ở chiều ngược lại
        // nên Homepage load danh sách này sẽ KHÔNG bị lỗi 500.
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    // POST: Thêm mới (Nhận DTO để xử lý cả list thuộc tính)
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CategoryDTO dto) {
        try {
            Category newCategory = categoryService.createCategory(dto);
            return ResponseEntity.ok(newCategory);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // PUT: Cập nhật (Nhận DTO để cập nhật lại list thuộc tính)
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Integer id, @RequestBody CategoryDTO dto) {
        try {
            Category updatedCategory = categoryService.updateCategory(id, dto);
            return ResponseEntity.ok(updatedCategory);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // DELETE: Xóa
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        try {
            categoryService.deleteCategory(id);
            return ResponseEntity.ok("Xóa danh mục thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}