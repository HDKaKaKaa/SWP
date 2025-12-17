package com.shopeefood.backend.dto;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import com.shopeefood.backend.entity.OrderItem;
import com.shopeefood.backend.entity.ProductDetail;

import lombok.Data;
import lombok.NoArgsConstructor;

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

        // --- Logic ánh xạ Options 
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
                                DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
                                symbols.setGroupingSeparator('.'); 
                                DecimalFormat formatter = new DecimalFormat("#,##0", symbols);
                                String formattedExtra = formatter.format(extra.longValue()); 
                                
                                optionStr += " (+" + formattedExtra + "đ)";
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