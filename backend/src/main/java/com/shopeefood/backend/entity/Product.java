package com.shopeefood.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    private String description;

    private Double price;

    private String image;
    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable = true;
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    @JsonIgnore
    private Restaurant restaurant;

    // ===== THÊM MỚI =====
    @OneToMany(
            mappedBy = "product",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY // Để mặc định KHÔNG load details nếu không cần
    )
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private List<ProductDetail> details;


    public Integer getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getImage() { return image; }
    public Boolean getIsAvailable() { return isAvailable; }
    public Double getPrice() { return price; }
    public Category getCategory() { return category; }
    public Restaurant getRestaurant() { return restaurant; }
    public List<ProductDetail> getDetails() { return details; }

    // Setters
    public void setId(Integer id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setImage(String image) { this.image = image; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
    public void setPrice(Double price) { this.price = price; }
    public void setCategory(Category category) { this.category = category; }
    public void setRestaurant(Restaurant restaurant) { this.restaurant = restaurant; }
    public void setDetails(List<ProductDetail> details) { this.details = details; }
}
