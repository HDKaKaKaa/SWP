package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<Product> getProducts(
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer restaurantId) {
        if (categoryId != null) {
            return productRepository.findByCategoryId(categoryId);
        }
        if (restaurantId != null) {
            return productRepository.findByRestaurantId(restaurantId);
        }
        return productRepository.findAll();
    }
}