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
        // 1. Validate định dạng cơ bản
        validateProductRequest(requestDto);

        // 2. Kiểm tra trùng tên trong cùng một nhà hàng
        if (requestDto.getRestaurantId() != null &&
                productRepository.existsByNameIgnoreCaseAndRestaurantId(requestDto.getName().trim(),
                        requestDto.getRestaurantId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tên món ăn '" + requestDto.getName() + "' đã tồn tại trong nhà hàng này.");
        }

        Product product = new Product();

        // 3. Xử lý Ảnh
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                product.setImage(cloudinaryService.uploadImage(imageFile));
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi upload ảnh.");
            }
        }

        // 4. Các trường cơ bản
        product.setName(requestDto.getName().trim());
        product.setDescription(requestDto.getDescription());
        product.setPrice(requestDto.getPrice() != null ? requestDto.getPrice().doubleValue() : 0.0);
        product.setIsAvailable(requestDto.getIsAvailable() != null ? requestDto.getIsAvailable() : true);

        // 5. Gán Category & Restaurant
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

        // 6. Xử lý Product Details (Options)
        if (requestDto.getProductDetails() != null) {
            List<ProductDetail> details = requestDto.getProductDetails().stream().map(detailReq -> {
                ProductDetail detail = new ProductDetail();
                detail.setProduct(product);
                detail.setValue(detailReq.getValue().trim());
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
    /**
     * CẬP NHẬT SẢN PHẨM (PUT)
     */
    @Transactional
    public OwnerProductDTO updateProduct(
            Integer productId,
            ProductUpdateRequestDTO requestDto,
            MultipartFile imageFile) {

        // 1. Tìm sản phẩm hiện tại (Chỉ gọi 1 lần duy nhất)
        Product existingProduct = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm không tồn tại."));

        // 2. Kiểm tra trùng tên món ăn trong cùng nhà hàng (trừ chính nó)
        Integer restaurantId = existingProduct.getRestaurant().getId();
        String updatedName = requestDto.getName().trim();
        if (productRepository.existsByNameIgnoreCaseAndRestaurantIdAndIdNot(updatedName, restaurantId, productId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tên món ăn '" + updatedName + "' đã tồn tại trong nhà hàng này.");
        }

        // 3. Validate định dạng dữ liệu (Tên, Giá, Mô tả...)
        validateProductRequest(requestDto);

        // 4. Kiểm tra trùng lặp Option ngay trong danh sách gửi lên (tránh gửi 2 cái
        // 'Size M')
        Set<String> checkSet = new HashSet<>();
        if (requestDto.getProductDetails() != null) {
            for (ProductDetailRequest detail : requestDto.getProductDetails()) {
                if (detail.getValue() == null || detail.getValue().trim().isEmpty())
                    continue;
                String uniqueKey = detail.getAttributeId() + ":" + detail.getValue().trim().toLowerCase();
                if (!checkSet.add(uniqueKey)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Tùy chọn '" + detail.getValue() + "' bị trùng lặp trong yêu cầu!");
                }
            }
        }

        // 5. Xử lý Ảnh (Nếu có file mới thì mới upload)
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                existingProduct.setImage(cloudinaryService.uploadImage(imageFile));
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi upload ảnh lên Cloudinary.");
            }
        }

        // 6. Cập nhật các thông tin cơ bản
        existingProduct.setName(updatedName);
        existingProduct.setDescription(requestDto.getDescription());
        if (requestDto.getPrice() != null) {
            existingProduct.setPrice(requestDto.getPrice().doubleValue());
        }
        existingProduct.setIsAvailable(requestDto.getIsAvailable());

        // 7. Cập nhật Category (nếu có thay đổi)
        if (requestDto.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Danh mục không tồn tại."));
            existingProduct.setCategory(category);
        }

        // 8. LOGIC ĐỒNG BỘ CHI TIẾT (PRODUCT DETAILS)

        // Bước 8.1: Lấy danh sách ID từ request gửi lên
        List<Integer> incomingIds = requestDto.getProductDetails().stream()
                .map(ProductDetailRequest::getId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        // Bước 8.2: Đánh dấu xoá mềm (isDeleted = true) cho các item trong DB mà KHÔNG
        // có trong request
        existingProduct.getDetails().stream()
                .filter(d -> d.getIsDeleted() == null || !d.getIsDeleted())
                .filter(d -> !incomingIds.contains(d.getId()))
                .forEach(d -> d.setIsDeleted(true));

        // Bước 8.3: Tạo Map để tra cứu nhanh các item hiện có
        Map<Integer, ProductDetail> dbDetailsMap = existingProduct.getDetails().stream()
                .filter(d -> d.getId() != null)
                .collect(Collectors.toMap(ProductDetail::getId, d -> d, (oldV, newV) -> oldV));

        // Bước 8.4: Duyệt qua danh sách Request để Cập nhật hoặc Thêm mới
        if (requestDto.getProductDetails() != null) {
            for (ProductDetailRequest detailReq : requestDto.getProductDetails()) {
                if (detailReq.getId() != null && dbDetailsMap.containsKey(detailReq.getId())) {
                    // CẬP NHẬT record cũ
                    ProductDetail detailToUpdate = dbDetailsMap.get(detailReq.getId());
                    detailToUpdate.setValue(detailReq.getValue().trim());
                    detailToUpdate.setPriceAdjustment(detailReq.getPriceAdjustment());
                    detailToUpdate.setIsDeleted(false);
                } else if (detailReq.getId() == null) {
                    // THÊM MỚI hoàn toàn
                    ProductDetail newDetail = new ProductDetail();
                    newDetail.setProduct(existingProduct);
                    newDetail.setValue(detailReq.getValue().trim());
                    newDetail.setPriceAdjustment(detailReq.getPriceAdjustment());
                    newDetail.setIsDeleted(false);

                    CategoryAttribute attribute = categoryAttributeRepository.findById(detailReq.getAttributeId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                    "Thuộc tính không tồn tại."));
                    newDetail.setAttribute(attribute);

                    existingProduct.getDetails().add(newDetail);
                }
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