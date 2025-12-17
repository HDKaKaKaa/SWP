package com.shopeefood.backend.dto;

import java.time.LocalDateTime;

import com.shopeefood.backend.entity.Feedback;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerFeedbackDTO {

    private Integer id;
    private Integer orderId;
    private String restaurantName;
    private String customerName;
    private String customerPhone; 
    private Integer rating;      
    private String comment;
    private LocalDateTime createdAt;
    private String orderNumber;
    /**
     * Constructor ánh xạ từ Feedback Entity.
     */
    public OwnerFeedbackDTO(Feedback feedback) {
        this.id = feedback.getId();
        this.rating = feedback.getRating(); 
        this.comment = feedback.getComment();
        this.createdAt = feedback.getCreatedAt();
        
        // --- 1. Thông tin Đơn hàng (Order) ---
        this.orderId = feedback.getOrder() != null ? feedback.getOrder().getId() : null;
        this.orderNumber = feedback.getOrder().getOrderNumber();
        // --- 2. Thông tin Nhà hàng (Restaurant) ---
        this.restaurantName = feedback.getRestaurant() != null ? feedback.getRestaurant().getName() : "N/A";
        
        // --- 3. Thông tin Khách hàng (Customer) ---
        if (feedback.getCustomer() != null) {
            this.customerName = feedback.getCustomer().getFullName(); 
            if (feedback.getCustomer().getAccount() != null) {
                this.customerPhone = feedback.getCustomer().getAccount().getPhone();
            } else {
                this.customerPhone = null;
            }
        } else {
            this.customerName = "Ẩn danh"; 
            this.customerPhone = null; 
        }
    }
}