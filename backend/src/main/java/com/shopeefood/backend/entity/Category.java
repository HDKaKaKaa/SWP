package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode; // Thêm cái này để tránh lỗi Lombok với List
import lombok.ToString;

import java.util.ArrayList; // Nhớ import
import java.util.List;

@Data
@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    private String image;

    private String description;

    // --- THÊM ĐOẠN NÀY ---
    // orphanRemoval = true: Khi xóa thuộc tính khỏi list, nó tự xóa trong DB
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
    @EqualsAndHashCode.Exclude // Tránh vòng lặp hashCode của Lombok
    @ToString.Exclude          // Tránh vòng lặp toString của Lombok
    private List<CategoryAttribute> attributes = new ArrayList<>();
}