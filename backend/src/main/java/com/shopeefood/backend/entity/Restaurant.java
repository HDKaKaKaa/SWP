package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "restaurants")
public class Restaurant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String address;
    private String phone;
    private String description;

    @Column(name = "cover_image")
    private String coverImage;

    @OneToMany(mappedBy = "restaurant")
    private List<Product> products;

    public enum RestaurantStatus {
        PENDING,
        ACTIVE,
        BLOCKED,
        REJECTED
    }

    @Enumerated(EnumType.STRING) // Lưu dưới dạng chuỗi "ACTIVE", "PENDING" vào DB
    @Column(columnDefinition = "ENUM('PENDING', 'ACTIVE', 'BLOCKED', 'REJECTED')")
    private RestaurantStatus status;
    // ----------------------------------

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}