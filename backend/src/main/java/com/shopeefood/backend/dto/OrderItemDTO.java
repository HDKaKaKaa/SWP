package com.shopeefood.backend.dto;

import com.shopeefood.backend.entity.OrderItem;
import com.shopeefood.backend.entity.ProductDetail;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class OrderItemDTO {
    private String productName;
    private int quantity;
    private BigDecimal price;

    // List string để hiển thị lên Frontend (VD: "Size: L (+5k)")
    private List<String> options = new ArrayList<>();

    public OrderItemDTO(OrderItem item) {
        if (item.getProduct() != null) {
            this.productName = item.getProduct().getName();
        }
        this.quantity = item.getQuantity();
        this.price = item.getPrice();

        // --- SỬA LẠI: Gọi item.getOptions() thay vì item.getOrderItemOptions() ---
        if (item.getOptions() != null) {
            this.options = item.getOptions().stream()
                    .map(option -> {
                        // 1. Lấy ProductDetail từ Option
                        ProductDetail detail = option.getProductDetail();

                        if (detail != null) {
                            // 2. Lấy tên thuộc tính (VD: "Size")
                            String attrName = "";
                            if (detail.getAttribute() != null) {
                                attrName = detail.getAttribute().getName();
                            }

                            String value = detail.getValue(); // VD: "L"
                            BigDecimal extra = detail.getPriceAdjustment(); // VD: 5000

                            // Format chuỗi: "Size: L (+5.000đ)"
                            String optionStr = attrName + ": " + value;
                            if (extra != null && extra.compareTo(BigDecimal.ZERO) > 0) {
                                optionStr += " (+" + String.format("%,.0f", extra).replace(",", ".") + "đ)";
                            }
                            return optionStr;
                        }
                        return "";
                    })
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }
    }
}