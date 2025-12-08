package com.shopeefood.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore; // <--- CÁI NÀY CỨU TRANG HOMEPAGE
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "category_attributes")
public class CategoryAttribute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id; // hoặc Long tùy DB của bạn

    private String name;

    private String dataType; // TEXT, NUMBER, SELECT...

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnore // <--- QUAN TRỌNG NHẤT: Ngăn chặn vòng lặp JSON gây lỗi 500
    private Category category;
}