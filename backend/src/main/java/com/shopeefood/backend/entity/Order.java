package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime; // CHỈ DÙNG GÓI NÀY
import java.util.List;

@Data
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Account customer;

    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    // Thông tin tiền nong (Dùng BigDecimal để tính tiền chính xác)
    private BigDecimal subtotal;

    @Column(name = "shipping_fee")
    private BigDecimal shippingFee;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "shipping_address")
    private String shippingAddress;

    @Column(name = "shipping_lat")
    private Double shippingLat;

    @Column(name = "shipping_long")
    private Double shippingLong;

    @Column(name = "payment_method")
    private String paymentMethod;

    private String status;
    private String note;

    // --- TẤT CẢ DÙNG LOCALDATETIME ---
    // Không cần @Temporal nữa

    // Phải là kiểu Shipper, KHÔNG ĐƯỢC là Account hay Integer
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipper_id")
    private Shipper shipper;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "restaurant_accepted_at")
    private LocalDateTime restaurantAcceptedAt;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "estimated_delivery_time_minutes")
    private Integer estimatedDeliveryTimeMinutes = 2; // Mặc định 2 phút (để test - có thể đổi lại 30 phút sau)
    // ----------------------------------

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> orderItems;

    // Hàm tự động set ngày tạo trước khi lưu
    @PrePersist
    protected void onCreate() {
        // Dùng LocalDateTime.now()
        createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
        if (paymentMethod == null) paymentMethod = "COD";
    }
}