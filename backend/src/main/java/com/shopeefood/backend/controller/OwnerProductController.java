package com.shopeefood.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import com.shopeefood.backend.service.OwnerProductService;
import com.shopeefood.backend.dto.OwnerProductDTO;
import com.shopeefood.backend.dto.ProductUpdateRequestDTO;

@RestController
@RequestMapping("/api/owner/products")
@RequiredArgsConstructor
public class OwnerProductController {

    private final OwnerProductService ownerProductService;

    @GetMapping
    public ResponseEntity<Page<OwnerProductDTO>> getProducts(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<OwnerProductDTO> products = ownerProductService.getProductsByOwner(
                ownerId,
                restaurantId,
                search,
                pageable);
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{productId}")
    public ResponseEntity<OwnerProductDTO> getProductDetails(@PathVariable Integer productId) {
        OwnerProductDTO product = ownerProductService.getProductById(productId);
        return ResponseEntity.ok(product);
    }

    @PutMapping("/{productId}")
    public ResponseEntity<OwnerProductDTO> updateProduct(
            @PathVariable Integer productId,
            @RequestPart("productRequest") ProductUpdateRequestDTO requestDto,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile) {
        OwnerProductDTO updatedProduct = ownerProductService.updateProduct(
                productId,
                requestDto,
                imageFile);
        return ResponseEntity.ok(updatedProduct);
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Integer productId) {

        ownerProductService.deleteProduct(productId);
        return ResponseEntity.noContent().build();
    }
}