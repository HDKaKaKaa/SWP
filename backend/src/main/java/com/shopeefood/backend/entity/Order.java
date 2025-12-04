package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

@Data
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Người đặt hàng (Liên kết với bảng Accounts)
    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Account customer;

    // Quán ăn (Liên kết với bảng Restaurants)
    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    // Thông tin tiền nong (Dùng BigDecimal để tính tiền chính xác)
    private BigDecimal subtotal;

    @Column(name = "shipping_fee")
    private BigDecimal shippingFee;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    // Thông tin giao hàng
    @Column(name = "shipping_address")
    private String shippingAddress;

    @Column(name = "shipping_lat")
    private Double shippingLat;

    @Column(name = "shipping_long")
    private Double shippingLong;

    @Column(name = "payment_method")
    private String paymentMethod; // VD: COD, VNPAY

    private String status; // VD: PENDING, SHIPPING...

    private String note;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    // Một đơn hàng có nhiều món (Để Hibernate tự xóa món khi xóa đơn)
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> orderItems;

    // Hàm tự động set ngày tạo trước khi lưu
    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
        if (status == null)
            status = "PENDING";
        if (paymentMethod == null)
            paymentMethod = "COD";
    }
}