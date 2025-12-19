package com.shopeefood.backend.entity;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "product_details")
public class ProductDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Món ăn
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore // tránh vòng lặp Product -> details -> Product
    private Product product;

    // Nhóm thuộc tính (Size, Mức đường, Mức chín...)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attribute_id", nullable = false)
    private CategoryAttribute attribute;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;
    // Giá trị hiển thị cho lựa chọn (vd: "Size L (lớn)", "100% đường")
    @Column(name = "value", nullable = false)
    private String value;

    // Số tiền cộng thêm cho lựa chọn này
    @Column(name = "price_adjustment", nullable = false)
    private BigDecimal priceAdjustment = BigDecimal.ZERO;

    public Integer getId() {
        return id;
    }

    public String getValue() {
        return value;
    }

    public BigDecimal getPriceAdjustment() {
        return priceAdjustment;
    }

    public Product getProduct() {
        return product;
    }

    public CategoryAttribute getAttribute() {
        return attribute;
    }

    // Setters
    public void setId(Integer id) {
        this.id = id;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public void setPriceAdjustment(BigDecimal priceAdjustment) {
        this.priceAdjustment = priceAdjustment;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public void setAttribute(CategoryAttribute attribute) {
        this.attribute = attribute;
    }
}
