package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.CategoryDTO;
import com.shopeefood.backend.entity.Category;
import com.shopeefood.backend.entity.CategoryAttribute;
import com.shopeefood.backend.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Thêm Transactional

import java.util.ArrayList; // Nhớ import
import java.util.List;

@Service
public class AdminCategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // 1. Lấy tất cả (Giữ nguyên, Homepage dùng cái này vẫn OK nhờ @JsonIgnore ở Entity con)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // 2. Tạo mới danh mục (CÓ SỬA ĐỔI)
    @Transactional // Thêm Transactional để đảm bảo toàn vẹn dữ liệu
    public Category createCategory(CategoryDTO dto) {
        if (categoryRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Tên danh mục đã tồn tại: " + dto.getName());
        }
        Category category = new Category();
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setImage(dto.getImage());

        // Xử lý thuộc tính
        if (dto.getAttributes() != null) {
            for (CategoryDTO.AttributeDTO attrDto : dto.getAttributes()) {
                CategoryAttribute attr = new CategoryAttribute();
                attr.setName(attrDto.getName());
                attr.setDataType(attrDto.getDataType());

                // Gán cha cho con
                attr.setCategory(category);

                // Thêm vào list của cha
                category.getAttributes().add(attr);
            }
        }

        return categoryRepository.save(category);
    }

    // 3. Cập nhật danh mục (CÓ SỬA ĐỔI)
    @Transactional
    public Category updateCategory(Integer id, CategoryDTO dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục ID: " + id));

        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setImage(dto.getImage());

        // --- LOGIC CẬP NHẬT THUỘC TÍNH ---
        // Xóa danh sách cũ đi để thay bằng danh sách mới
        // (Hibernate sẽ tự xóa các record cũ trong DB nhờ orphanRemoval=true)
        if (category.getAttributes() == null) {
            category.setAttributes(new ArrayList<>());
        } else {
            category.getAttributes().clear();
        }

        // Thêm danh sách mới từ FE
        if (dto.getAttributes() != null) {
            for (CategoryDTO.AttributeDTO attrDto : dto.getAttributes()) {
                CategoryAttribute attr = new CategoryAttribute();
                attr.setName(attrDto.getName());
                attr.setDataType(attrDto.getDataType());

                attr.setCategory(category); // Quan trọng
                category.getAttributes().add(attr);
            }
        }

        return categoryRepository.save(category);
    }

    // 4. Xóa danh mục (Giữ nguyên)
    public void deleteCategory(Integer id) {
        if (!categoryRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy danh mục để xóa");
        }
        categoryRepository.deleteById(id);
    }
}