package com.shopeefood.backend.dto;

import com.shopeefood.backend.entity.Order;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class OrderDTO {
    private Integer id;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private String paymentMethod;

    // --- Thông tin hiển thị ---
    private String customerName;
    private String restaurantName;
    private String shipperName;
    private String shipperEmail;

    // --- Thông tin chi tiết ---
    private String shippingAddress;
    private String note;

    // --- Timeline ---
    private LocalDateTime createdAt;
    private LocalDateTime restaurantAcceptedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime completedAt;

    // --- Danh sách món ăn ---
    private List<OrderItemDTO> items = new ArrayList<>();

    // Constructor mapping từ Entity sang DTO
    public OrderDTO(Order order) {
        this.id = order.getId();
        this.status = order.getStatus();
        this.subtotal = order.getSubtotal();
        this.shippingFee = order.getShippingFee();
        this.totalAmount = order.getTotalAmount();
        this.paymentMethod = order.getPaymentMethod();
        this.shippingAddress = order.getShippingAddress();
        this.note = order.getNote();

        // Map timeline
        this.createdAt = order.getCreatedAt();
        this.restaurantAcceptedAt = order.getRestaurantAcceptedAt();
        this.shippedAt = order.getShippedAt();
        this.completedAt = order.getCompletedAt();

        // Map Nhà hàng (Giả sử Restaurant entity có hàm getName())
        if (order.getRestaurant() != null) {
            this.restaurantName = order.getRestaurant().getName();
        }

        // Map Shipper (Nếu Shipper entity có fullName và quan hệ với Account để lấy
        // email)
        if (order.getShipper() != null) {
            this.shipperName = order.getShipper().getFullName();
            if (order.getShipper().getAccount() != null) {
                this.shipperEmail = order.getShipper().getAccount().getEmail();
            }
        }

        // Map danh sách món ăn
        if (order.getOrderItems() != null) {
            this.items = order.getOrderItems().stream()
                    .map(OrderItemDTO::new)
                    .collect(Collectors.toList());
        }
        //Map khách hàng
        if (order.getCustomer() != null) {
            this.customerName = order.getCustomer().getUsername();
        }

    }
}