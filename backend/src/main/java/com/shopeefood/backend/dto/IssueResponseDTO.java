package com.shopeefood.backend.dto;

import java.time.LocalDateTime;

import com.shopeefood.backend.entity.Issue;

import lombok.Data;

@Data
public class IssueResponseDTO {
    private Integer id;
    private String code;
    private String status;
    private String title;

    private String orderNumber;

    private String customerFullName;
    private String customerPhone;
    private LocalDateTime updatedAt;
    private String category;
    private String otherCategory;
    private java.math.BigDecimal totalAmount;
    private java.math.BigDecimal ownerRefundAmount;

    public IssueResponseDTO(Issue entity) {
        this.id = entity.getId();
        this.code = entity.getCode();
        this.status = entity.getStatus();
        this.title = entity.getTitle();
        this.updatedAt = entity.getUpdatedAt();
        this.category = entity.getCategory();
        this.otherCategory = entity.getOtherCategory();
        this.ownerRefundAmount = entity.getOwnerRefundAmount();
        if (entity.getOrder() != null) {
            this.totalAmount = entity.getOrder().getTotalAmount();
        }
        if (entity.getOrder() != null) {
            this.orderNumber = entity.getOrder().getOrderNumber();
            if (entity.getOrder().getCustomerName() != null) {
                this.customerFullName = entity.getOrder().getCustomerName().getFullName();
            }
            if (entity.getOrder().getCustomer() != null) {
                this.customerPhone = entity.getOrder().getCustomer().getPhone();
            }
        }
    }
}