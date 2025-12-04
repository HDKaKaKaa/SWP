package com.shopeefood.backend.dto;

import com.shopeefood.backend.entity.OrderItem;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class OrderItemDTO {
    private String productName;
    private int quantity;
    private BigDecimal price; // Giá tại thời điểm đặt

    public OrderItemDTO(OrderItem item) {
        // Giả sử OrderItem có quan hệ N-1 với Product
        if (item.getProduct() != null) {
            this.productName = item.getProduct().getName();
        }
        this.quantity = item.getQuantity();
        this.price = item.getPrice();
    }
}