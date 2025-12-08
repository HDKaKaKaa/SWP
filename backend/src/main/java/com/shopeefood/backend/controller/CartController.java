package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.AddToCartRequest;
import com.shopeefood.backend.dto.CartResponse;
import com.shopeefood.backend.dto.UpdateCartItemRequest;
import com.shopeefood.backend.dto.UpdateItemQuantityRequest;
import com.shopeefood.backend.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    // Lấy giỏ hàng hiện tại theo accountId
    @GetMapping
    public ResponseEntity<?> getCart(@RequestParam Integer accountId, @RequestParam Integer restaurantId) {
        return ResponseEntity.ok(cartService.getCart(accountId, restaurantId));
    }

    // Thêm món vào giỏ
    @PostMapping("/items")
    public ResponseEntity<?> addItem(@RequestBody AddToCartRequest request) {
        return ResponseEntity.ok(cartService.addToCart(request));
    }

    // Cập nhật số lượng 1 món
    @PutMapping("/items")
    public ResponseEntity<?> updateItem(@RequestBody UpdateCartItemRequest request) {
        return ResponseEntity.ok(cartService.updateItem(request));
    }

    // Xoá 1 món khỏi giỏ
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<?> removeItem(
            @RequestParam Integer accountId,
            @PathVariable Integer productId
    ) {
        return ResponseEntity.ok(cartService.removeItem(accountId, productId));
    }

    // Xoá toàn bộ giỏ
    @DeleteMapping
    public ResponseEntity<?> clearCart(@RequestParam Integer accountId, @RequestParam Integer restaurantId) {
        cartService.clearCart(accountId, restaurantId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/items/quantity")
    public CartResponse updateItemQuantity(@RequestBody UpdateItemQuantityRequest request) {
        return cartService.updateItemQuantity(
                request.getAccountId(),
                request.getItemId(),
                request.getQuantity()
        );
    }

}
