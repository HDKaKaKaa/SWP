package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonManagedReference;
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
    private Double latitude;
    private Double longitude;

    @Column(name = "cover_image")
    private String coverImage;

    @OneToMany(mappedBy = "restaurant")
    @JsonManagedReference
    private List<Product> products;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private Owner owner;

    public enum RestaurantStatus {
        PENDING,
        ACTIVE,
        BLOCKED,
        REJECTED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private RestaurantStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}