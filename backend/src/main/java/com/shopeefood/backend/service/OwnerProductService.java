package com.shopeefood.backend.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.shopeefood.backend.repository.ProductRepository;
import com.shopeefood.backend.repository.CategoryRepository;
import com.shopeefood.backend.repository.CategoryAttributeRepository;

import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.ProductDetail;
import com.shopeefood.backend.entity.Category;
import com.shopeefood.backend.entity.CategoryAttribute;

import com.shopeefood.backend.dto.OwnerProductDTO;
import com.shopeefood.backend.dto.ProductDetailRequest;
import com.shopeefood.backend.dto.ProductUpdateRequestDTO;

@Service
@RequiredArgsConstructor
public class OwnerProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryAttributeRepository categoryAttributeRepository;
    private final CloudinaryService cloudinaryService;

    // Lấy danh sách sản phẩm (getProductsByOwner)
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

        return productPage.map(this::convertToDTO);
    }

    private OwnerProductDTO convertToDTO(Product product) {
        return new OwnerProductDTO(product);
    }

    // Lấy chi tiết sản phẩm theo ID (getProductById)
    @Transactional(readOnly = true)
    public OwnerProductDTO getProductById(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Product not found with id: " + productId));
        return new OwnerProductDTO(product);
    }

    // Cập nhật sản phẩm
    @Transactional
    public OwnerProductDTO updateProduct(
            Integer productId,
            ProductUpdateRequestDTO requestDto,
            MultipartFile imageFile) {

        // 1. Tìm sản phẩm hiện có
        Product existingProduct = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Product not found with id: " + productId));

        // 2. Xử lý Ảnh
        if (imageFile != null && !imageFile.isEmpty()) {
            String contentType = imageFile.getContentType();
            if (contentType == null || !isValidImageType(contentType)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Định dạng file ảnh không hợp lệ cho sản phẩm. Chỉ chấp nhận JPG, JPEG, và PNG.");
            }

            try {
                String newImageUrl = cloudinaryService.uploadImage(imageFile);
                existingProduct.setImage(newImageUrl);

            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Lỗi khi tải ảnh sản phẩm lên Cloudinary: " + e.getMessage(), e);
            }
        }

        // 3. Cập nhật các trường chính từ DTO
        existingProduct.setName(requestDto.getName());
        existingProduct.setDescription(requestDto.getDescription());

        if (requestDto.getPrice() != null) {
            existingProduct.setPrice(requestDto.getPrice().doubleValue());
        }
        existingProduct.setIsAvailable(requestDto.getIsAvailable());

        // 4. Cập nhật Category
        if (requestDto.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(
                            () -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                    "Category not found with id: " + requestDto.getCategoryId()));
            existingProduct.setCategory(category);
        }

        // 5. XỬ LÝ PRODUCT DETAILS
        List<ProductDetail> currentDetails = existingProduct.getDetails();

        Map<Integer, ProductDetailRequest> newDetailRequestMap = requestDto.getProductDetails().stream()
                .filter(d -> d.getId() != null)
                .collect(Collectors.toMap(ProductDetailRequest::getId, d -> d));

        // Xóa các chi tiết cũ không còn trong request
        currentDetails.removeIf(detail -> detail.getId() != null && !newDetailRequestMap.containsKey(detail.getId()));

        for (ProductDetailRequest newDetailDto : requestDto.getProductDetails()) {
            if (newDetailDto.getId() != null) {
                currentDetails.stream()
                        .filter(d -> d.getId() != null && d.getId().equals(newDetailDto.getId()))
                        .findFirst()
                        .ifPresent(existingDetail -> {
                            existingDetail.setPriceAdjustment(newDetailDto.getPriceAdjustment());
                            existingDetail.setValue(newDetailDto.getValue());
                        });
            } else {
                if (newDetailDto.getAttributeId() == null) {
                    throw new IllegalArgumentException("Attribute ID is required for a new product detail.");
                }

                ProductDetail newDetail = new ProductDetail();
                newDetail.setProduct(existingProduct);
                newDetail.setPriceAdjustment(newDetailDto.getPriceAdjustment());
                newDetail.setValue(newDetailDto.getValue());

                CategoryAttribute categoryAttribute = categoryAttributeRepository
                        .findById(newDetailDto.getAttributeId())
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                        "Category Attribute not found with id: " + newDetailDto.getAttributeId()));

                newDetail.setAttribute(categoryAttribute);

                currentDetails.add(newDetail);
            }
        }

        // 6. Lưu sản phẩm
        Product updatedProduct = productRepository.save(existingProduct);
        return new OwnerProductDTO(updatedProduct);
    }

    // Xóa sản phẩm (deleteProduct)
    @Transactional
    public void deleteProduct(Integer productId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Product not found with id: " + productId));

        productRepository.deleteById(productId);
    }

    private boolean isValidImageType(String contentType) {
        // Chấp nhận: image/jpeg, image/png
        return contentType.startsWith("image/jpeg")
                || contentType.startsWith("image/png")
                || contentType.startsWith("image/jpg");
    }
}