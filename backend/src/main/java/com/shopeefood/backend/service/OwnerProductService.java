package com.shopeefood.backend.service;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
        validateProductRequest(requestDto);
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
        // 1. Kiểm tra trùng lặp productDetail trong cùng 1 sản phẩm
        java.util.Set<String> checkSet = new java.util.HashSet<>();
        //valid trường 
        validateProductRequest(requestDto);
        for (ProductDetailRequest detail : requestDto.getProductDetails()) {
            if (detail.getValue() == null || detail.getValue().trim().isEmpty())
                continue;

            // Tạo key: "ID_Thuoc_Tinh:Gia_Tri" -> VD: "1:Size L"
            String uniqueKey = detail.getAttributeId() + ":" + detail.getValue().trim().toLowerCase();

            if (!checkSet.add(uniqueKey)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Tùy chọn '" + detail.getValue() + "' đã tồn tại trong sản phẩm này!");
            }
        }
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
        if (requestDto.getPrice() != null)
            existingProduct.setPrice(requestDto.getPrice().doubleValue());
        existingProduct.setIsAvailable(requestDto.getIsAvailable());

        if (requestDto.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
            existingProduct.setCategory(category);
        }
        // Bước 1: Lấy danh sách ID details từ Frontend gửi lên
        List<Integer> incomingIds = requestDto.getProductDetails().stream()
                .map(ProductDetailRequest::getId)
                .filter(id -> id != null)
                .collect(Collectors.toList());

        // Bước 2: Đánh dấu xoá mềm (isDeleted = true) cho các item trong DB mà KHÔNG có
        // trong request
        existingProduct.getDetails().stream()
                .filter(d -> d.getIsDeleted() == null || !d.getIsDeleted())
                .filter(d -> !incomingIds.contains(d.getId()))
                .forEach(d -> d.setIsDeleted(true));

        // Bước 3: Tạo Map để tra cứu nhanh các item hiện có trong DB
        Map<Integer, ProductDetail> dbDetailsMap = existingProduct.getDetails().stream()
                .filter(d -> d.getId() != null)
                .collect(Collectors.toMap(
                        ProductDetail::getId,
                        d -> d,
                        (existing, replacement) -> existing));
        // Bước 4: Duyệt qua danh sách từ Request để Cập nhật hoặc Thêm mới
        for (ProductDetailRequest detailReq : requestDto.getProductDetails()) {
            if (detailReq.getId() != null && dbDetailsMap.containsKey(detailReq.getId())) {
                // CẬP NHẬT: record đã tồn tại
                ProductDetail detailToUpdate = dbDetailsMap.get(detailReq.getId());
                detailToUpdate.setValue(detailReq.getValue());
                detailToUpdate.setPriceAdjustment(detailReq.getPriceAdjustment());
                detailToUpdate.setIsDeleted(false); // Đảm bảo record này active
            } else if (detailReq.getId() == null) {
                // THÊM MỚI: record chưa có ID
                ProductDetail newDetail = new ProductDetail();
                newDetail.setProduct(existingProduct);
                newDetail.setValue(detailReq.getValue());
                newDetail.setPriceAdjustment(detailReq.getPriceAdjustment());
                newDetail.setIsDeleted(false);

                CategoryAttribute attribute = categoryAttributeRepository.findById(detailReq.getAttributeId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attribute not found"));
                newDetail.setAttribute(attribute);

                existingProduct.getDetails().add(newDetail);
            }
        }

        return new OwnerProductDTO(productRepository.save(existingProduct));
    }

    // xoá mềm sản phẩm
    @Transactional
    public void deleteProduct(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        product.setIsAvailable(false);
        productRepository.save(product);
    }

    // Validation Patterns
    private static final java.util.regex.Pattern NAME_PATTERN = java.util.regex.Pattern
            .compile("^[a-zA-Z0-9À-ỹà-ỹ0-9 _\\-.,()]+$");

    private void validateProductRequest(ProductUpdateRequestDTO dto) {
        // 1. Validate Tên
        if (dto.getName() == null || dto.getName().trim().length() < 2 || dto.getName().trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên sản phẩm phải từ 2-100 ký tự.");
        }
        if (!NAME_PATTERN.matcher(dto.getName()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên sản phẩm không được chứa ký tự đặc biệt.");
        }

        // 2. Validate Giá
        if (dto.getPrice() == null || dto.getPrice().doubleValue() < 0 || dto.getPrice().doubleValue() > 100000000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá sản phẩm không hợp lệ (0 - 100tr).");
        }

        // 3. Validate Mô tả
        if (dto.getDescription() != null && dto.getDescription().length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mô tả không được quá 500 ký tự.");
        }

        // 4. Chống trùng lặp Product Detail trong cùng 1 Attribute
        if (dto.getProductDetails() != null) {
            Set<String> uniqueKeys = new HashSet<>();
            for (ProductDetailRequest detail : dto.getProductDetails()) {
                String val = detail.getValue() != null ? detail.getValue().trim().toLowerCase() : "";
                if (val.isEmpty())
                    continue;

                if (val.length() > 50) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Tùy chọn '" + val + "' quá dài (tối đa 50 ký tự).");
                }

                String key = detail.getAttributeId() + ":" + val;
                if (!uniqueKeys.add(key)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Tùy chọn '" + detail.getValue() + "' bị trùng lặp trong cùng một nhóm.");
                }
            }
        }
    }

}