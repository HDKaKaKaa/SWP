package com.shopeefood.backend.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.shopeefood.backend.dto.CategoryDTO;
import com.shopeefood.backend.entity.Category; // Thêm Transactional
import com.shopeefood.backend.entity.CategoryAttribute; // Nhớ import
import com.shopeefood.backend.repository.CategoryRepository;

@Service
public class AdminCategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // 1. Lấy tất cả (Giữ nguyên, Homepage dùng cái này vẫn OK nhờ @JsonIgnore ở
    // Entity con)
    public List<Category> getAllCategories(String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return categoryRepository.searchByKeyword(keyword.trim());
        }
        return categoryRepository.findAll();
    }

    // Hàm validate chung (Private)
    private void validateCategory(CategoryDTO dto) {
        // Validate độ dài
        if (dto.getName() != null && dto.getName().length() > 100) {
            throw new RuntimeException("Tên danh mục không được vượt quá 100 ký tự!");
        }
        if (dto.getDescription() != null && dto.getDescription().length() > 100) {
            throw new RuntimeException("Mô tả không được vượt quá 100 ký tự!");
        }
    }

    // 2. Tạo mới danh mục (CÓ SỬA ĐỔI)
    @Transactional
    public Category createCategory(CategoryDTO dto) {
        validateCategory(dto);

        // Check trùng (Không phân biệt hoa thường)
        if (categoryRepository.existsByNameIgnoreCase(dto.getName().trim())) {
            throw new RuntimeException("Tên danh mục đã tồn tại (trùng tên): " + dto.getName());
        }

        Category category = new Category();
        category.setName(dto.getName().trim()); // Trim cho sạch
        category.setDescription(dto.getDescription());
        category.setImage(dto.getImage());

        if (dto.getAttributes() != null) {
            for (CategoryDTO.AttributeDTO attrDto : dto.getAttributes()) {
                CategoryAttribute attr = new CategoryAttribute();
                attr.setName(attrDto.getName());
                attr.setDataType(attrDto.getDataType());
                attr.setCategory(category);
                category.getAttributes().add(attr);
            }
        }

        return categoryRepository.save(category);
    }

    // 3. Cập nhật danh mục (CÓ SỬA ĐỔI)
    @Transactional
    public Category updateCategory(Integer id, CategoryDTO dto) {
        validateCategory(dto);

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục ID: " + id));

        // Check trùng khi update (Loại trừ chính nó)
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(dto.getName().trim(), id)) {
            throw new RuntimeException("Tên danh mục đã tồn tại ở một mục khác: " + dto.getName());
        }

        category.setName(dto.getName().trim());
        category.setDescription(dto.getDescription());
        category.setImage(dto.getImage());

        // Logic Smart Merge (Giữ nguyên như code cũ của bạn)
        List<CategoryDTO.AttributeDTO> incomingAttrs = dto.getAttributes();
        List<CategoryAttribute> currentAttrs = category.getAttributes();

        if (incomingAttrs != null) {
            List<Integer> keptIds = new ArrayList<>();
            for (CategoryDTO.AttributeDTO attrDto : incomingAttrs) {
                if (attrDto.getId() != null) {
                    CategoryAttribute existingAttr = currentAttrs.stream()
                            .filter(a -> a.getId().equals(attrDto.getId()))
                            .findFirst().orElse(null);
                    if (existingAttr != null) {
                        existingAttr.setName(attrDto.getName());
                        existingAttr.setDataType(attrDto.getDataType());
                        keptIds.add(existingAttr.getId());
                    }
                } else {
                    CategoryAttribute newAttr = new CategoryAttribute();
                    newAttr.setName(attrDto.getName());
                    newAttr.setDataType(attrDto.getDataType());
                    newAttr.setCategory(category);
                    currentAttrs.add(newAttr);
                }
            }
            currentAttrs.removeIf(attr -> attr.getId() != null && !keptIds.contains(attr.getId()));
        } else {
            currentAttrs.clear();
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