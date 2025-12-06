package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.ProductDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductDetailRepository extends JpaRepository<ProductDetail, Integer> {

    List<ProductDetail> findByProductId(Integer productId);
}
