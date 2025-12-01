package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Tự động tăng ID
    private Integer id;

    @Column(nullable = false)
    private String name;

    private String image;

    private String description;
}