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

        // --- LOGIC CẬP NHẬT THÔNG MINH (SMART MERGE) ---

        List<CategoryDTO.AttributeDTO> incomingAttrs = dto.getAttributes();
        List<CategoryAttribute> currentAttrs = category.getAttributes();

        if (incomingAttrs != null) {
            List<Integer> keptIds = new ArrayList<>();

            for (CategoryDTO.AttributeDTO attrDto : incomingAttrs) {
                if (attrDto.getId() != null) {
                    // TRƯỜNG HỢP 1: UPDATE (Đã có ID)
                    // Tìm thuộc tính cũ trong list hiện tại để sửa
                    CategoryAttribute existingAttr = currentAttrs.stream()
                            .filter(a -> a.getId().equals(attrDto.getId()))
                            .findFirst()
                            .orElse(null);

                    if (existingAttr != null) {
                        existingAttr.setName(attrDto.getName());
                        existingAttr.setDataType(attrDto.getDataType());
                        keptIds.add(existingAttr.getId());
                    }
                } else {
                    // TRƯỜNG HỢP 2: INSERT (Mới tinh, chưa có ID)
                    CategoryAttribute newAttr = new CategoryAttribute();
                    newAttr.setName(attrDto.getName());
                    newAttr.setDataType(attrDto.getDataType());
                    newAttr.setCategory(category);

                    // Thêm vào list hiện tại
                    currentAttrs.add(newAttr);
                }
            }

            // TRƯỜNG HỢP 3: DELETE
            // Những cái cũ không nằm trong danh sách "keptIds" và cũng không phải mới thêm -> Xóa
            // Lưu ý: Nếu thuộc tính này đang được Product sử dụng, dòng này sẽ gây lỗi SQL 23503.
            // Bạn có thể try-catch khối này nếu muốn thông báo lỗi thân thiện hơn.
            currentAttrs.removeIf(attr ->
                    attr.getId() != null && !keptIds.contains(attr.getId())
            );

        } else {
            // Nếu gửi lên null -> Xóa hết (Sẽ lỗi nếu có ràng buộc)
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