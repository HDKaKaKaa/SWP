package com.shopeefood.backend.service;

import com.shopeefood.backend.repository.*;
import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.dto.ProductCreationRequest;
import com.shopeefood.backend.dto.ProductDetailRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {
    
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final RestaurantRepository restaurantRepository;
    private final CategoryAttributeRepository attributeRepository;
    private final ObjectMapper objectMapper;
    private final CloudinaryService cloudinaryService;

    // Constructor injection
    public ProductService(
        ProductRepository productRepository, 
        CategoryRepository categoryRepository, 
        RestaurantRepository restaurantRepository, 
        CategoryAttributeRepository attributeRepository, 
        ObjectMapper objectMapper,
        CloudinaryService cloudinaryService
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.restaurantRepository = restaurantRepository;
        this.attributeRepository = attributeRepository;
        this.objectMapper = objectMapper;
        this.cloudinaryService = cloudinaryService; 
    }

    @Transactional
    public Product createNewProduct(ProductCreationRequest request, MultipartFile imageFile) throws Exception {
        
        // 1. Xử lý File Upload (Gọi hàm uploadImage)
        String imageUrl = cloudinaryService.uploadImage(imageFile);

        // 2. Lấy Entities phụ thuộc
        Category category = categoryRepository.findById(request.getCategoryId())
            .orElseThrow(() -> new IllegalArgumentException("Category not found with ID: " + request.getCategoryId()));
        Restaurant restaurant = restaurantRepository.findById(request.getRestaurantId())
            .orElseThrow(() -> new IllegalArgumentException("Restaurant not found with ID: " + request.getRestaurantId()));

        // 3. Tạo Product Entity
        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setIsAvailable(request.getIsAvailable());
        product.setCategory(category);
        product.setRestaurant(restaurant);
        product.setImage(imageUrl);
        Product savedProduct = productRepository.save(product);

        // 4. Xử lý Product Details
        if (request.getProductDetails() != null && !request.getProductDetails().isEmpty()) {
            List<ProductDetailRequest> detailRequests = request.getProductDetails();

            List<ProductDetail> details = detailRequests.stream()
                .map(detailReq -> {
                    CategoryAttribute attribute = attributeRepository.findById(detailReq.getAttributeId())
                        .orElseThrow(() -> new IllegalArgumentException("Attribute not found with ID: " + detailReq.getAttributeId()));
                    
                    ProductDetail detail = new ProductDetail();
                    detail.setValue(detailReq.getValue());
                    detail.setPriceAdjustment(detailReq.getPriceAdjustment());
                    detail.setAttribute(attribute);
                    detail.setProduct(savedProduct); 
                    return detail;
                })
                .collect(Collectors.toList());
            
            savedProduct.setDetails(details); 
            productRepository.save(savedProduct);
        }
        
        return savedProduct;
    }
    
    // Hàm tìm kiếm Restaurants của Owner
    public List<Restaurant> getRestaurantsByOwnerAccount(Integer ownerAccountId) {
        return restaurantRepository.findByOwnerId(ownerAccountId);
    }
    
    // Hàm tìm Categories
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }
    
    // Hàm tìm Attributes theo Category 
    public List<CategoryAttribute> getAttributesByCategoryId(Integer categoryId) {
        return attributeRepository.findByCategory_Id(categoryId);
    }
}