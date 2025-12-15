package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.service.ProductService;
import com.shopeefood.backend.dto.ProductCreationRequest;
import com.shopeefood.backend.dto.ProductUpdateRequestDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ProductService productService;

    @GetMapping
    public List<Product> getProducts(
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer restaurantId) {

        if (categoryId != null) {
            return productRepository.findByCategoryIdWithDetails(categoryId);
        }

        if (restaurantId != null) {
            return productRepository.findByRestaurantIdWithDetails(restaurantId);
        }

        return productRepository.findAll();
    }

    // Tạo sản phẩm
    @PostMapping(consumes = { "multipart/form-data" })
    public ResponseEntity<Product> createProduct(
            @RequestPart("productRequest") ProductCreationRequest request,
            @RequestPart("imageFile") MultipartFile imageFile) throws Exception {

        Product newProduct = productService.createNewProduct(request, imageFile);
        return ResponseEntity.ok(newProduct);
    }

    // Cập nhật sản phẩm
    @PutMapping(value = "/{id}", consumes = { "multipart/form-data" })
    public ResponseEntity<Product> updateProduct(
            @PathVariable Long id,
            @RequestPart("productRequest") ProductUpdateRequestDTO request,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) throws Exception {

        request.setId(id.intValue());
        Product updatedProduct = productService.updateProduct(request, imageFile);
        return ResponseEntity.ok(updatedProduct);
    }
}