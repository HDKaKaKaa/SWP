package com.shopeefood.backend.dto;

import java.math.BigDecimal;

public class ProductDetailRequest {
private String value;
    private BigDecimal priceAdjustment;
    private Integer attributeId; 

    // Getters
    public String getValue() { return value; }
    public BigDecimal getPriceAdjustment() { return priceAdjustment; }
    public Integer getAttributeId() { return attributeId; }

    // Setters
    public void setValue(String value) { this.value = value; }
    public void setPriceAdjustment(BigDecimal priceAdjustment) { this.priceAdjustment = priceAdjustment; }
    public void setAttributeId(Integer attributeId) { this.attributeId = attributeId; }
}