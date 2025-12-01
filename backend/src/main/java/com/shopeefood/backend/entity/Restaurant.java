package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
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
}