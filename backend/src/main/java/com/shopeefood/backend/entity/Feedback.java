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

    // Đánh giá shipper và thời gian giao (từ customer)
    @Column(name = "shipper_rating")
    private Integer shipperRating;

    @Column(name = "shipper_comment", columnDefinition = "TEXT")
    private String shipperComment;

    // Đánh giá customer/đơn hàng từ shipper
    @Column(name = "shipper_to_customer_rating")
    private Integer shipperToCustomerRating;

    @Column(name = "shipper_to_customer_comment", columnDefinition = "TEXT")
    private String shipperToCustomerComment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
}