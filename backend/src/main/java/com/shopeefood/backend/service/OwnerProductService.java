package com.shopeefood.backend.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.repository.CategoryRepository; 
import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.Category; 
import com.shopeefood.backend.dto.OwnerProductDTO; 
import com.shopeefood.backend.dto.ProductDTO; 
import com.shopeefood.backend.dto.ProductUpdateRequestDTO; 

@Service
@RequiredArgsConstructor 
public class OwnerProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    
    // Lấy danh sách sản phẩm của Owner với filter: restaurant, search, page-size
    public Page<OwnerProductDTO> getProductsByOwner(
            Integer ownerId,
            Integer restaurantId,
            String search,
            Pageable pageable) {

        Integer filterRestaurantId = (restaurantId != null && restaurantId > 0) ? restaurantId : null;
        String filterSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        Page<Product> productPage = productRepository.findProductsByOwnerIdAndFilters(
            ownerId,
            filterRestaurantId,
            filterSearch,
            pageable
        );

        return productPage.map(this::convertToDTO);
    }

    private OwnerProductDTO convertToDTO(Product product) {
        return new OwnerProductDTO(product); 
    }
    
    // Lấy chi tiết sản phẩm theo ID
    public ProductDTO getProductById(Integer productId) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found with id: " + productId));
        return new ProductDTO(product); 
    }

    // Cập nhật sản phẩm

    public ProductDTO updateProduct(Integer productId, ProductUpdateRequestDTO requestDto, Integer currentOwnerId) {
        
        // 1. Tìm sản phẩm hiện có. Nếu không tìm thấy, ném RuntimeException.
        Product existingProduct = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + productId));

        // 2. Cập nhật các trường từ DTO
        existingProduct.setName(requestDto.getName());
        existingProduct.setDescription(requestDto.getDescription());
        
        if (requestDto.getPrice() != null) {
            existingProduct.setPrice(requestDto.getPrice().doubleValue());
        }

        existingProduct.setImage(requestDto.getImage());
        existingProduct.setIsAvailable(requestDto.getIsAvailable());
        
        // 3. Cập nhật Category: Tìm Entity Category mới và gán. Nếu không tìm thấy, ném RuntimeException.
        if (requestDto.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + requestDto.getCategoryId()));
            existingProduct.setCategory(category);
        }

        Product updatedProduct = productRepository.save(existingProduct);
        return new ProductDTO(updatedProduct);
    }
    
    //Xóa sản phẩm
    public void deleteProduct(Integer productId) {

        productRepository.deleteById(productId);
    }
}