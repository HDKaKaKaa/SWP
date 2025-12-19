package com.shopeefood.backend.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.shopeefood.backend.dto.OwnerProductDTO;
import com.shopeefood.backend.dto.ProductDetailRequest;
import com.shopeefood.backend.dto.ProductUpdateRequestDTO;
import com.shopeefood.backend.entity.Category;
import com.shopeefood.backend.entity.CategoryAttribute;
import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.ProductDetail;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.CategoryAttributeRepository;
import com.shopeefood.backend.repository.CategoryRepository;
import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.repository.RestaurantRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OwnerProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryAttributeRepository categoryAttributeRepository;
    private final RestaurantRepository restaurantRepository; 
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public Page<OwnerProductDTO> getProductsByOwner(
            Integer ownerId,
            Integer restaurantId,
            Integer categoryId,
            Boolean isAvailable,
            String search,
            Pageable pageable) {

        Integer filterRestaurantId = (restaurantId != null && restaurantId > 0) ? restaurantId : null;
        Integer filterCategoryId = (categoryId != null && categoryId > 0) ? categoryId : null;
        String filterSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        Page<Product> productPage = productRepository.findProductsByOwnerIdAndFilters(
                ownerId,
                filterRestaurantId,
                filterCategoryId,
                isAvailable,
                filterSearch,
                pageable);

        return productPage.map(OwnerProductDTO::new);
    }

    @Transactional(readOnly = true)
    public OwnerProductDTO getProductById(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Product not found with id: " + productId));
        return new OwnerProductDTO(product);
    }

    /**
     * TẠO MỚI SẢN PHẨM (POST)
     */
    @Transactional
    public OwnerProductDTO createProduct(ProductUpdateRequestDTO requestDto, MultipartFile imageFile) {
        Product product = new Product();

        // 1. Xử lý Ảnh
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                product.setImage(cloudinaryService.uploadImage(imageFile));
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi upload ảnh.");
            }
        }

        // 2. Các trường cơ bản
        product.setName(requestDto.getName());
        product.setDescription(requestDto.getDescription());
        product.setPrice(requestDto.getPrice() != null ? requestDto.getPrice().doubleValue() : 0.0);
        product.setIsAvailable(requestDto.getIsAvailable() != null ? requestDto.getIsAvailable() : true);

        // 3. Category & Restaurant
        if (requestDto.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
            product.setCategory(category);
        }

        if (requestDto.getRestaurantId() != null) {
            Restaurant restaurant = restaurantRepository.findById(requestDto.getRestaurantId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Restaurant not found"));
            product.setRestaurant(restaurant);
        }

        // 4. Product Details
        if (requestDto.getProductDetails() != null) {
            List<ProductDetail> details = requestDto.getProductDetails().stream().map(detailReq -> {
                ProductDetail detail = new ProductDetail();
                detail.setProduct(product);
                detail.setValue(detailReq.getValue());
                detail.setPriceAdjustment(detailReq.getPriceAdjustment());

                CategoryAttribute attr = categoryAttributeRepository.findById(detailReq.getAttributeId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attribute not found"));
                detail.setAttribute(attr);
                return detail;
            }).collect(Collectors.toList());
            product.setDetails(details);
        }

        return new OwnerProductDTO(productRepository.save(product));
    }

    /**
     * CẬP NHẬT SẢN PHẨM (PUT)
     */
    @Transactional
    public OwnerProductDTO updateProduct(
            Integer productId,
            ProductUpdateRequestDTO requestDto,
            MultipartFile imageFile) {

        Product existingProduct = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                existingProduct.setImage(cloudinaryService.uploadImage(imageFile));
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi upload ảnh.");
            }
        }

        existingProduct.setName(requestDto.getName());
        existingProduct.setDescription(requestDto.getDescription());
        if (requestDto.getPrice() != null) existingProduct.setPrice(requestDto.getPrice().doubleValue());
        existingProduct.setIsAvailable(requestDto.getIsAvailable());

        if (requestDto.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
            existingProduct.setCategory(category);
        }

        // Xử lý Detail (Không xóa cái cũ)
        Map<Integer, ProductDetail> existingDetailsMap = existingProduct.getDetails().stream()
                .filter(d -> d.getId() != null)
                .collect(Collectors.toMap(ProductDetail::getId, d -> d));

        for (ProductDetailRequest detailRequest : requestDto.getProductDetails()) {
            if (detailRequest.getId() != null && existingDetailsMap.containsKey(detailRequest.getId())) {
                ProductDetail detailToUpdate = existingDetailsMap.get(detailRequest.getId());
                detailToUpdate.setValue(detailRequest.getValue());
                detailToUpdate.setPriceAdjustment(detailRequest.getPriceAdjustment());
            } else if (detailRequest.getId() == null) {
                ProductDetail newDetail = new ProductDetail();
                newDetail.setProduct(existingProduct);
                newDetail.setValue(detailRequest.getValue());
                newDetail.setPriceAdjustment(detailRequest.getPriceAdjustment());
                CategoryAttribute attribute = categoryAttributeRepository.findById(detailRequest.getAttributeId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attribute not found"));
                newDetail.setAttribute(attribute);
                existingProduct.getDetails().add(newDetail);
            }
        }

        return new OwnerProductDTO(productRepository.save(existingProduct));
    }

    @Transactional
    public void deleteProduct(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        product.setIsAvailable(false);
        productRepository.save(product);
    }

}