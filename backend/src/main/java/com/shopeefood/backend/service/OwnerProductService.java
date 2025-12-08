package com.shopeefood.backend.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.dto.OwnerProductDTO;

@Service
@RequiredArgsConstructor
public class OwnerProductService {

    private final ProductRepository productRepository;

    public Page<OwnerProductDTO> getProductsByOwner(
            Integer ownerId,
            Integer restaurantId,
            String search,
            Pageable pageable) {

        // Xử lý tham số tìm kiếm và lọc
        Integer filterRestaurantId = (restaurantId != null && restaurantId > 0) ? restaurantId : null;
        String filterSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        Page<Product> productPage = productRepository.findProductsByOwnerIdAndFilters(
            ownerId,
            filterRestaurantId,
            filterSearch,
            pageable
        );

        // Chuyển đổi Page<Product> thành Page<ProductDTO>
        return productPage.map(this::convertToDTO);
    }

    private OwnerProductDTO convertToDTO(Product product) {
        return new OwnerProductDTO(product); 
    }
    
    public void deleteProduct(Integer productId) {
        productRepository.deleteById(productId);
    }
}