package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "feedbacks")
public class Feedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    // Mỗi đơn hàng chỉ được đánh giá 1 lần
    @OneToOne
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    // Đánh giá shipper và thời gian giao
    @Column(name = "shipper_rating")
    private Integer shipperRating;

    @Column(name = "shipper_comment", columnDefinition = "TEXT")
    private String shipperComment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}