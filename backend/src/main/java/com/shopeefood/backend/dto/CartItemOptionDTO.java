package com.shopeefood.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CartItemOptionDTO {

    private Integer detailId;         // id của product_details
    private String attributeName;     // Tên thuộc tính (Size, Đá, Topping...)
    private String value;             // Giá trị hiển thị (Lạnh, Ít đá, Thạch dừa...)
    private BigDecimal priceAdjustment; // Tiền cộng thêm (nếu có)
}
