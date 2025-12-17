package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "issues")
public class Issue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "order_id")
    private Integer orderId;

    @Column(name = "created_by_id", nullable = false)
    private Integer createdById;

    @Column(name = "created_by_role", nullable = false)
    private String createdByRole; // CUSTOMER/SHIPPER/OWNER/ADMIN

    @Column(name = "target_type", nullable = false)
    private String targetType; // ORDER/RESTAURANT/SHIPPER/OTHER

    @Column(name = "target_id")
    private Integer targetId;

    @Column(name = "target_note")
    private String targetNote;

    @Column(nullable = false)
    private String category; // ... OTHER

    @Column(name = "other_category")
    private String otherCategory;

    @Column(nullable = false)
    private String title;

    @Column
    private String description;

    @Column(name = "assigned_owner_id")
    private Integer assignedOwnerId;

    @Column(name = "assigned_admin_id")
    private Integer assignedAdminId;

    @Column(nullable = false)
    private String status; // OPEN/...

    @Column(name = "owner_refund_status", nullable = false)
    private String ownerRefundStatus; // NONE/PENDING/APPROVED/REJECTED

    @Column(name = "owner_refund_amount")
    private BigDecimal ownerRefundAmount;

    @Column(name = "admin_credit_status", nullable = false)
    private String adminCreditStatus; // NONE/PENDING/APPROVED/REJECTED

    @Column(name = "admin_credit_amount")
    private BigDecimal adminCreditAmount;

    @Column(name = "resolved_reason")
    private String resolvedReason;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) this.status = "OPEN";
        if (this.ownerRefundStatus == null) this.ownerRefundStatus = "NONE";
        if (this.adminCreditStatus == null) this.adminCreditStatus = "NONE";
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
