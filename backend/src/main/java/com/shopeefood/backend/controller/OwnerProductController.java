package com.shopeefood.backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.shopeefood.backend.dto.OwnerProductDTO;
import com.shopeefood.backend.dto.ProductUpdateRequestDTO;
import com.shopeefood.backend.service.OwnerProductService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/owner/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") 
public class OwnerProductController {

    private final OwnerProductService ownerProductService;

    // Lấy danh sách sản phẩm
    @GetMapping
    public ResponseEntity<Page<OwnerProductDTO>> getProducts(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Boolean isAvailable,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(ownerProductService.getProductsByOwner(ownerId, restaurantId, categoryId, isAvailable, search, pageable));
    }

    // Lấy chi tiết 1 sản phẩm
    @GetMapping("/{productId}")
    public ResponseEntity<OwnerProductDTO> getProductDetails(@PathVariable Integer productId) {
        return ResponseEntity.ok(ownerProductService.getProductById(productId));
    }

    // TẠO MỚI (Khớp với AddProduct.js)
    @PostMapping(consumes = { "multipart/form-data" })
    public ResponseEntity<OwnerProductDTO> createProduct(
            @RequestPart("productRequest") ProductUpdateRequestDTO requestDto,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) {
        
        return ResponseEntity.status(HttpStatus.CREATED).body(ownerProductService.createProduct(requestDto, imageFile));
    }

    // CẬP NHẬT
    @PutMapping(value = "/{productId}", consumes = { "multipart/form-data" })
    public ResponseEntity<OwnerProductDTO> updateProduct(
            @PathVariable Integer productId,
            @RequestPart("productRequest") ProductUpdateRequestDTO requestDto,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) {

        return ResponseEntity.ok(ownerProductService.updateProduct(productId, requestDto, imageFile));
    }

    // XÓA MỀM
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Integer productId) {
        ownerProductService.deleteProduct(productId);
        return ResponseEntity.noContent().build();
    }
}