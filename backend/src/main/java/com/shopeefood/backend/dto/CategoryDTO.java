package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class CategoryDTO {
    private String name;
    private String description;
    private String image; // Front-end sẽ gửi link ảnh hoặc tên file
}