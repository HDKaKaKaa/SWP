package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.AddToCartRequest;
import com.shopeefood.backend.dto.CartItemOptionDTO;
import com.shopeefood.backend.dto.CartItemResponse;
import com.shopeefood.backend.dto.CartResponse;
import com.shopeefood.backend.dto.UpdateCartItemRequest;
import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CartService {

    private static final String CART_STATUS = "CART";
    private static final BigDecimal DEFAULT_SHIPPING_FEE = BigDecimal.valueOf(15000);

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductDetailRepository productDetailRepository;

    @Autowired
    private OrderItemOptionRepository orderItemOptionRepository;

    // ----------------- ADD TO CART -----------------
    @Transactional
    public CartResponse addToCart(AddToCartRequest request) {
        Integer accountId = request.getAccountId();
        Integer restaurantId = request.getRestaurantId();

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        Customer customer = customerRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Bắt buộc phải có địa chỉ giao hàng
        if (customer.getAddress() == null || customer.getAddress().trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "CUSTOMER_ADDRESS_REQUIRED"
            );
        }

        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        int quantity = (request.getQuantity() != null && request.getQuantity() > 0)
                ? request.getQuantity()
                : 1;

        // ==== Load các ProductDetail (options) từ detailIds ====
        List<Integer> detailIds = request.getDetailIds();
        List<ProductDetail> selectedDetails = java.util.Collections.emptyList();
        if (detailIds != null && !detailIds.isEmpty()) {
            selectedDetails = productDetailRepository.findAllById(detailIds);
        }

        BigDecimal finalUnitPrice = calculateFinalUnitPrice(product, selectedDetails);

        // ==== Tìm hoặc tạo giỏ hàng của NHÀ HÀNG HIỆN TẠI (status = CART) ====
        Order order = orderRepository
                .findFirstByCustomerIdAndRestaurantIdAndStatus(accountId, restaurantId, CART_STATUS)
                .orElseGet(() -> {
                    Order o = new Order();
                    o.setCustomer(account);
                    o.setRestaurant(restaurant);
                    o.setStatus(CART_STATUS);
                    o.setShippingAddress(customer.getAddress());
                    o.setPaymentMethod("PAYOS");
                    o.setShippingFee(DEFAULT_SHIPPING_FEE);
                    o.setSubtotal(BigDecimal.ZERO);
                    o.setTotalAmount(DEFAULT_SHIPPING_FEE);
                    o = orderRepository.save(o);
                    o.setOrderNumber(Order.buildOrderNumber(o.getId()));
                    return orderRepository.save(o);
                });

        // ==== TÌM XEM ĐÃ CÓ DÒNG NÀO CÙNG PRODUCT + CÙNG COMBO OPTIONS CHƯA ====
        OrderItem item = findItemWithSameOptions(order, product, selectedDetails);

        if (item == null) {
            // ---- Chưa có => tạo dòng mới ----
            item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(quantity);
            item.setPrice(finalUnitPrice);

            // Tạo list options cho item này
            if (!selectedDetails.isEmpty()) {
                List<OrderItemOption> options = new java.util.ArrayList<>();
                for (ProductDetail d : selectedDetails) {
                    OrderItemOption opt = new OrderItemOption();
                    opt.setOrderItem(item);
                    opt.setProductDetail(d);
                    options.add(opt);
                }
                item.setOptions(options);
            }

            orderItemRepository.save(item);
        } else {
            // ---- Đã có cùng combo options => cộng dồn quantity ----
            item.setQuantity(item.getQuantity() + quantity);
            // Giá unit giữ theo finalUnitPrice hiện tại
            item.setPrice(finalUnitPrice);
            orderItemRepository.save(item);
        }

        recalcTotals(order);

        return mapToCartResponse(loadOrder(order.getId()));
    }

    // ----------------- GET CART -----------------
    @Transactional(readOnly = true)
    public CartResponse getCart(Integer accountId, Integer restaurantId) {

        Optional<Order> optCart =
                orderRepository.findFirstByCustomerIdAndRestaurantIdAndStatus(
                        accountId, restaurantId, CART_STATUS
                );

        if (optCart.isEmpty()) {
            CartResponse res = new CartResponse();
            res.setOrderId(null);
            res.setStatus(null);

            res.setRestaurantId(restaurantId);
            res.setRestaurantName(null);
            res.setRestaurantAddress(null);

            res.setShippingAddress(null);

            res.setItems(List.of());
            res.setSubtotal(BigDecimal.ZERO);
            res.setShippingFee(BigDecimal.ZERO);
            res.setTotal(BigDecimal.ZERO);

            return res;
        }

        return mapToCartResponse(optCart.get());
    }


    // ----------------- UPDATE ITEM (THEO productId - CŨ, GIỜ HẠN CHẾ) -----------------
    /**
     * Giữ lại cho tương thích cũ, nhưng:
     * - Nếu có nhiều OrderItem cùng productId (khác combo options) => báo lỗi,
     *   buộc FE dùng API theo itemId.
     */
    @Transactional
    public CartResponse updateItem(UpdateCartItemRequest request) {

        Order order = orderRepository
                .findFirstByCustomerIdAndStatus(request.getAccountId(), CART_STATUS)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            return removeItem(request.getAccountId(), request.getProductId());
        }

        List<OrderItem> items = orderItemRepository.findAllByOrderAndProduct(order, product);

        if (items.isEmpty()) {
            throw new RuntimeException("Cart item not found");
        }
        if (items.size() > 1) {
            // Có nhiều combo options cho cùng 1 product -> phải dùng itemId
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "MULTIPLE_ITEMS_FOR_PRODUCT_USE_ITEM_ID"
            );
        }

        OrderItem item = items.get(0);
        item.setQuantity(request.getQuantity());
        orderItemRepository.save(item);

        recalcTotals(order);

        return mapToCartResponse(loadOrder(order.getId()));
    }

    // ----------------- REMOVE ITEM (THEO productId - CŨ, GIỜ HẠN CHẾ) -----------------
    @Transactional
    public CartResponse removeItem(Integer accountId, Integer productId) {

        Order order = orderRepository
                .findFirstByCustomerIdAndStatus(accountId, CART_STATUS)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        List<OrderItem> items = orderItemRepository.findAllByOrderAndProduct(order, product);

        if (items.isEmpty()) {
            throw new RuntimeException("Cart item not found");
        }
        if (items.size() > 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "MULTIPLE_ITEMS_FOR_PRODUCT_USE_ITEM_ID"
            );
        }

        OrderItem item = items.get(0);
        orderItemRepository.delete(item);

        List<OrderItem> remain = orderItemRepository.findByOrder(order);

        if (remain.isEmpty()) {
            // Không còn món nào -> có thể xoá cả order hoặc giữ lại tuỳ design
            orderRepository.delete(order);

            CartResponse res = new CartResponse();
            res.setItems(List.of());
            res.setSubtotal(BigDecimal.ZERO);
            res.setShippingFee(DEFAULT_SHIPPING_FEE);
            res.setTotal(DEFAULT_SHIPPING_FEE);
            return res;
        }

        recalcTotals(order);

        return mapToCartResponse(loadOrder(order.getId()));
    }

    // ----------------- UPDATE ITEM QUANTITY (THEO itemId MỚI) -----------------
    @Transactional
    public CartResponse updateItemQuantity(Integer accountId, Integer itemId, Integer newQuantity) {
        if (newQuantity == null || newQuantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_QUANTITY");
        }

        OrderItem item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ITEM_NOT_FOUND"));

        Order order = item.getOrder();

        // Đảm bảo item thuộc về customer này
        if (!order.getCustomer().getId().equals(accountId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ITEM_NOT_OF_ACCOUNT");
        }

        if (newQuantity == 0) {
            orderItemRepository.delete(item);
        } else {
            item.setQuantity(newQuantity);
            orderItemRepository.save(item);
        }

        recalcTotals(order);
        return mapToCartResponse(loadOrder(order.getId()));
    }


    // ----------------- CLEAR CART -----------------
    @Transactional
    public void clearCart(Integer accountId, Integer restaurantId) {
        Optional<Order> opt = orderRepository
                .findFirstByCustomerIdAndRestaurantIdAndStatus(
                        accountId, restaurantId, CART_STATUS
                );

        if (opt.isEmpty()) {
            return;
        }

        Order order = opt.get();

        List<OrderItem> items = orderItemRepository.findByOrder(order);

        if (items != null && !items.isEmpty()) {
            orderItemRepository.deleteAll(items);
        }

        if (order.getOrderItems() != null) {
            order.getOrderItems().clear();
        }

        order.setStatus("CANCELLED");
        order.setSubtotal(BigDecimal.ZERO);
        order.setShippingFee(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);

        orderRepository.save(order);
    }


    // ----------------- HELPER -----------------
    private void recalcTotals(Order order) {

        List<OrderItem> items = orderItemRepository.findByOrder(order);

        BigDecimal subtotal = items.stream()
                .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setSubtotal(subtotal);
        order.setShippingFee(order.getShippingFee() != null ? order.getShippingFee() : DEFAULT_SHIPPING_FEE);
        order.setTotalAmount(subtotal.add(order.getShippingFee()));

        orderRepository.save(order);
    }

    private Order loadOrder(Integer id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    private CartResponse mapToCartResponse(Order order) {

        CartResponse res = new CartResponse();
        res.setOrderId(order.getId());
        res.setStatus(order.getStatus());

        if (order.getRestaurant() != null) {
            Restaurant r = order.getRestaurant();
            res.setRestaurantId(r.getId());
            res.setRestaurantName(r.getName());
            res.setRestaurantAddress(r.getAddress());
        }

        res.setShippingAddress(order.getShippingAddress());

        List<OrderItem> items = orderItemRepository.findByOrder(order);

        res.setItems(
                items.stream().map(oi -> {
                    CartItemResponse dto = new CartItemResponse();
                    dto.setItemId(oi.getId());                         // <=== MỚI
                    dto.setProductId(oi.getProduct().getId());
                    dto.setProductName(oi.getProduct().getName());
                    dto.setProductImage(oi.getProduct().getImage());
                    dto.setUnitPrice(oi.getPrice());
                    dto.setQuantity(oi.getQuantity());
                    dto.setLineTotal(
                            oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity()))
                    );

                    // ==== MAP OPTIONS RA DTO ====
                    if (oi.getOptions() != null && !oi.getOptions().isEmpty()) {
                        List<CartItemOptionDTO> optDtos = oi.getOptions().stream().map(opt -> {
                            CartItemOptionDTO od = new CartItemOptionDTO();
                            ProductDetail d = opt.getProductDetail();
                            od.setDetailId(d.getId());
                            if (d.getAttribute() != null) {
                                od.setAttributeName(d.getAttribute().getName());
                            }
                            od.setValue(d.getValue());
                            od.setPriceAdjustment(
                                    d.getPriceAdjustment() != null ? d.getPriceAdjustment() : BigDecimal.ZERO
                            );
                            return od;
                        }).collect(Collectors.toList());
                        dto.setOptions(optDtos);
                    } else {
                        dto.setOptions(List.of());
                    }

                    return dto;
                }).collect(Collectors.toList())
        );

        res.setSubtotal(order.getSubtotal());
        res.setShippingFee(order.getShippingFee());
        res.setTotal(order.getTotalAmount());

        return res;
    }

    /**
     * Tính giá unitPrice cuối cùng = giá gốc + tổng priceAdjustment của các option
     */
    private BigDecimal calculateFinalUnitPrice(Product product, List<ProductDetail> details) {
        BigDecimal basePrice = product.getPrice() != null
                ? BigDecimal.valueOf(product.getPrice())
                : BigDecimal.ZERO;

        BigDecimal extra = BigDecimal.ZERO;
        if (details != null) {
            for (ProductDetail d : details) {
                if (d.getPriceAdjustment() != null) {
                    extra = extra.add(d.getPriceAdjustment());
                }
            }
        }
        return basePrice.add(extra);
    }

    /**
     * Tìm OrderItem trong order có cùng product + cùng tập detailIds (options).
     * Nếu không có -> return null.
     */
    private OrderItem findItemWithSameOptions(Order order,
                                              Product product,
                                              List<ProductDetail> selectedDetails) {

        List<OrderItem> items = orderItemRepository.findAllByOrderAndProduct(order, product);

        Set<Integer> selectedIds = (selectedDetails == null || selectedDetails.isEmpty())
                ? java.util.Collections.emptySet()
                : selectedDetails.stream()
                .map(ProductDetail::getId)
                .collect(java.util.stream.Collectors.toSet());

        for (OrderItem item : items) {
            List<OrderItemOption> opts = item.getOptions();
            Set<Integer> optIds = (opts == null || opts.isEmpty())
                    ? java.util.Collections.emptySet()
                    : opts.stream()
                    .map(o -> o.getProductDetail().getId())
                    .collect(java.util.stream.Collectors.toSet());

            if (optIds.equals(selectedIds)) {
                return item;
            }
        }
        return null;
    }
}
