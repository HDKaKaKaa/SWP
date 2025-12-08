package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor // Cần thiết cho Jackson
@AllArgsConstructor
public class CategoryDTO {
    private String name;
    private String description;
    private String image;

    // Thêm danh sách thuộc tính để nhận từ FE
    private List<AttributeDTO> attributes;

    // Inner Class cho thuộc tính (DTO con)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttributeDTO {
        private Integer id; // Cần ID để biết là sửa hay thêm mới
        private String name;
        private String dataType;
    }
}