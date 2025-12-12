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

    @Column(name = "is_required")
    private Boolean isRequired = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnore
    private Category category;


    public Integer getId() { return id; }
    public String getName() { return name; }
    public String getDataType() { return dataType; }
    public Category getCategory() { return category; }

    public void setId(Integer id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setDataType(String dataType) { this.dataType = dataType; }
    public void setCategory(Category category) { this.category = category; }
}