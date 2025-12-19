package com.shopeefood.backend.dto;

import java.util.List;
import java.util.stream.Collectors;

import com.shopeefood.backend.entity.Product;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class OwnerProductDTO {
    private Integer id;
    private Integer restaurantId;
    private Integer categoryId;
    private String categoryName;
    private String name;
    private String description;
    private Double price;
    private String image;
    private Boolean isAvailable;
    private List<ProductDetailDTO> details;

    // Constructor thủ công để ánh xạ từ Entity Product
    public OwnerProductDTO(Product product) {
        this.id = product.getId();
        this.restaurantId = product.getRestaurant() != null ? product.getRestaurant().getId() : null;
        this.name = product.getName();
        this.description = product.getDescription();
        this.price = product.getPrice();
        this.image = product.getImage();
        this.isAvailable = product.getIsAvailable();

        if (product.getCategory() != null) {
            this.categoryId = product.getCategory().getId();
            this.categoryName = product.getCategory().getName();
        }
        if (product.getDetails() != null) {
            this.details = product.getDetails().stream()
                    .map(ProductDetailDTO::new)
                    .collect(Collectors.toList());
        }
    }
}