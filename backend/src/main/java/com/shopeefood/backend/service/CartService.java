package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.AddToCartRequest;
import com.shopeefood.backend.dto.CartItemResponse;
import com.shopeefood.backend.dto.CartResponse;
import com.shopeefood.backend.dto.UpdateCartItemRequest;
import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
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

    // ----------------- ADD TO CART -----------------
    @Transactional
    public CartResponse addToCart(AddToCartRequest request) {

        Integer accountId = request.getAccountId();
        Integer restaurantId = request.getRestaurantId();

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        Customer customer = customerRepository.findById(accountId)
                .orElse(null);

        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        int quantity = (request.getQuantity() != null && request.getQuantity() > 0)
                ? request.getQuantity()
                : 1;

        // Tìm giỏ hiện tại
        Optional<Order> optCart =
                orderRepository.findFirstByCustomerIdAndStatus(accountId, CART_STATUS);

        Order order;

        if (optCart.isEmpty()) {
            // Giỏ mới
            order = new Order();
            order.setCustomer(account);
            order.setRestaurant(restaurant);
            order.setStatus(CART_STATUS);
            order.setShippingAddress(customer.getAddress());
            order.setShippingFee(DEFAULT_SHIPPING_FEE);
            order.setSubtotal(BigDecimal.ZERO);
            order.setTotalAmount(BigDecimal.ZERO);
            order = orderRepository.save(order);
        } else {
            order = optCart.get();

            // Nếu đang ở giỏ của quán khác → clear items + chuyển quán
            if (!order.getRestaurant().getId().equals(restaurantId)) {
                List<OrderItem> oldItems = orderItemRepository.findByOrder(order);
                orderItemRepository.deleteAll(oldItems);
                order.getOrderItems().clear();
                order.setRestaurant(restaurant);
                order.setShippingAddress(customer.getAddress());
            }
        }

        // Tìm item trong giỏ
        Optional<OrderItem> optItem =
                orderItemRepository.findByOrderAndProduct(order, product);

        if (optItem.isPresent()) {
            OrderItem item = optItem.get();
            item.setQuantity(item.getQuantity() + quantity);
            orderItemRepository.save(item);
        } else {
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(quantity);
            item.setPrice(BigDecimal.valueOf(product.getPrice()));
            orderItemRepository.save(item);
        }

        recalcTotals(order);

        return mapToCartResponse(loadOrder(order.getId()));
    }


    // ----------------- GET CART -----------------
    @Transactional(readOnly = true)
    public CartResponse getCart(Integer accountId) {

        Optional<Order> optCart =
                orderRepository.findFirstByCustomerIdAndStatus(accountId, CART_STATUS);

        if (optCart.isEmpty()) {
            CartResponse res = new CartResponse();
            res.setItems(List.of());
            res.setSubtotal(BigDecimal.ZERO);
            res.setShippingFee(DEFAULT_SHIPPING_FEE);
            res.setTotal(DEFAULT_SHIPPING_FEE);
            return res;
        }

        return mapToCartResponse(optCart.get());
    }


    // ----------------- UPDATE ITEM -----------------
    @Transactional
    public CartResponse updateItem(UpdateCartItemRequest request) {

        Order order = orderRepository
                .findFirstByCustomerIdAndStatus(request.getAccountId(), CART_STATUS)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Nếu quantity <=0 → xoá
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            return removeItem(request.getAccountId(), request.getProductId());
        }

        OrderItem item = orderItemRepository.findByOrderAndProduct(order, product)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        item.setQuantity(request.getQuantity());
        orderItemRepository.save(item);

        recalcTotals(order);

        return mapToCartResponse(loadOrder(order.getId()));
    }


    // ----------------- REMOVE ITEM -----------------
    @Transactional
    public CartResponse removeItem(Integer accountId, Integer productId) {

        Order order = orderRepository
                .findFirstByCustomerIdAndStatus(accountId, CART_STATUS)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        OrderItem item = orderItemRepository.findByOrderAndProduct(order, product)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        orderItemRepository.delete(item);

        List<OrderItem> remain = orderItemRepository.findByOrder(order);

        if (remain.isEmpty()) {
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


    // ----------------- CLEAR CART -----------------
    @Transactional
    public void clearCart(Integer accountId) {
        orderRepository.findFirstByCustomerIdAndStatus(accountId, CART_STATUS)
                .ifPresent(order -> {
                    orderItemRepository.deleteAll(order.getOrderItems());
                    orderRepository.delete(order);
                });
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

        // Sửa lại phần restaurant
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
                    dto.setProductId(oi.getProduct().getId());
                    dto.setProductName(oi.getProduct().getName());
                    dto.setProductImage(oi.getProduct().getImage());
                    dto.setUnitPrice(oi.getPrice());
                    dto.setQuantity(oi.getQuantity());
                    dto.setLineTotal(
                            oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity()))
                    );
                    return dto;
                }).collect(Collectors.toList())
        );

        res.setSubtotal(order.getSubtotal());
        res.setShippingFee(order.getShippingFee());
        res.setTotal(order.getTotalAmount());

        return res;
    }
}
