package com.shopeefood.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.*;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;

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

    // Giá trị hiển thị cho lựa chọn (vd: "Size L (lớn)", "100% đường")
    @Column(name = "value", nullable = false)
    private String value;

    // Số tiền cộng thêm cho lựa chọn này
    @Column(name = "price_adjustment", nullable = false)
    private BigDecimal priceAdjustment = BigDecimal.ZERO;
}
