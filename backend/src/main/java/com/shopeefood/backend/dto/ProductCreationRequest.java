package com.shopeefood.backend.dto;

import java.util.List;

public class ProductCreationRequest {
    
    private String name;
    private String description;
    private Integer categoryId;
    private Double price;
    private Boolean isAvailable;
    private Integer restaurantId;
    private List<ProductDetailRequest> productDetails; 

    // Getters
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Integer getCategoryId() { return categoryId; }
    public Double getPrice() { return price; }
    public Boolean getIsAvailable() { return isAvailable; }
    public Integer getRestaurantId() { return restaurantId; }
    public List<ProductDetailRequest> getProductDetails() { return productDetails; }

    // Setters
    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }
    public void setPrice(Double price) { this.price = price; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
    public void setRestaurantId(Integer restaurantId) { this.restaurantId = restaurantId; }
    public void setProductDetails(List<ProductDetailRequest> productDetails) { this.productDetails = productDetails; }
}