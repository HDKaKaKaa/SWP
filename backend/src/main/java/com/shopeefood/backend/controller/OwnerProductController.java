package com.shopeefood.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import com.shopeefood.backend.service.OwnerProductService;
import com.shopeefood.backend.dto.OwnerProductDTO;

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
            pageable
        );
        return ResponseEntity.ok(products);
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Integer productId) {
        ownerProductService.deleteProduct(productId);
        return ResponseEntity.noContent().build(); 
    }
}