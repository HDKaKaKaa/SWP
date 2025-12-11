package com.shopeefood.backend.dto;

import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.ProductDetail;
import lombok.Data;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class ProductDTO {
    private Integer id;
    private String name;
    private String description;

    // DTO vẫn nên dùng BigDecimal để tính toán tiền nong cho chuẩn xác ở Frontend
    private BigDecimal price;

    private String image;
    private String status;
    private String categoryName;

    // Danh sách chi tiết thuộc tính
    private List<ProductDetailDTO> details = new ArrayList<>();

    public ProductDTO(Product product) {
        this.id = product.getId();
        this.name = product.getName();
        this.description = product.getDescription();
        this.image = product.getImage();

        // SỬA 1: Convert Double (Entity) -> BigDecimal (DTO)
        if (product.getPrice() != null) {
            this.price = BigDecimal.valueOf(product.getPrice());
        } else {
            this.price = BigDecimal.ZERO;
        }

        // SỬA 2: Xử lý Boolean (Lombok sinh getter là getIsAvailable cho kiểu Boolean wrapper)
        if (Boolean.TRUE.equals(product.getIsAvailable())) {
            this.status = "Đang bán";
        } else {
            this.status = "Hết hàng";
        }

        if (product.getCategory() != null) {
            this.categoryName = product.getCategory().getName();
        }

        // SỬA 3: Gọi đúng tên getter là getDetails() (vì Entity khai báo là 'details')
        if (product.getDetails() != null) {
            this.details = product.getDetails().stream()
                    .map(ProductDetailDTO::new)
                    .collect(Collectors.toList());
        }
    }

    @Data
    public static class ProductDetailDTO {
        private Integer id;
        private String attributeName;
        private String value;
        private BigDecimal priceAdjustment;

        public ProductDetailDTO(ProductDetail detail) {
            this.id = detail.getId();
            this.value = detail.getValue();
            this.priceAdjustment = detail.getPriceAdjustment();

            if (detail.getAttribute() != null) {
                this.attributeName = detail.getAttribute().getName();
            }
        }
    }
}