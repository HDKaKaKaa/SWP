package com.shopeefood.backend.service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.CustomerRepository;
import com.shopeefood.backend.repository.OrderRepository;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private CustomerRepository customerRepository;

    // Lấy đơn hàng cho Owner, với filter: restaurant, search, from-to, page-size
    public Page<OrderDTO> getOrdersForOwner(Integer ownerId, Integer restaurantId, String status,
            int page, int size, String search,
            LocalDateTime from, LocalDateTime to, String sortField, String sortDir) {
        List<String> allowedStatuses;
        if (status != null && !status.isBlank()) {
            allowedStatuses = List.of(status);
        } else {
            allowedStatuses = List.of("PENDING", "PAID", "PREPARING", "SHIPPING", "COMPLETED", "CANCELLED", "REFUNDED");
        }
        if (to == null)
            to = LocalDateTime.now();

        String searchPattern = null;
        if (search != null && !search.trim().isEmpty()) {
            searchPattern = "%" + search.trim().toLowerCase() + "%";
        }

        // Xử lý sort
        Sort sort;

        if (sortField == null || sortField.isBlank()) {
            // sort mặc định
            sort = Sort.by(Sort.Direction.DESC, "createdAt");
        } else {
            // sort theo user
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("asc"))
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;

            sort = Sort.by(direction, sortField);
        }

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Order> ordersPage = orderRepository.findOrderIdsByOwnerAndRestaurant(
                ownerId,
                restaurantId,
                searchPattern,
                from,
                to,
                allowedStatuses,
                pageable);
        if (ordersPage.isEmpty()) {
            return new PageImpl<Order>(Collections.emptyList(), pageable, 0).map(OrderDTO::new);
        }

        // 4. BƯỚC 2: Lấy chi tiết đơn hàng (dùng JOIN FETCH) bằng các ID đã lấy
        List<Integer> orderIds = ordersPage.getContent().stream()
                .map(Order::getId)
                .collect(Collectors.toList());
        List<Order> ordersWithDetails = orderRepository.findOrdersWithDetailsByIds(orderIds);
        Map<Integer, Order> orderMap = ordersWithDetails.stream()
                .collect(Collectors.toMap(Order::getId, Function.identity()));

        List<Order> sortedOrders = orderIds.stream()
                .map(orderMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // lấy thông tin khách hàng
        List<Integer> customerAccountIds = sortedOrders.stream()
                .map(o -> o.getCustomer() != null ? o.getCustomer().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<Integer, String> customerNameMap = customerRepository.findAllById(customerAccountIds)
                .stream()
                .collect(Collectors.toMap(
                        c -> c.getAccountId(),
                        c -> c.getFullName() != null ? c.getFullName() : ""));

        // 6. Trả về Page<OrderDTO> hoàn chỉnh
        return new PageImpl<>(
                sortedOrders,
                pageable,
                ordersPage.getTotalElements()).map(order -> {
                    OrderDTO dto = new OrderDTO(order);

                    if (order.getCustomer() != null) {
                        dto.setCustomerPhone(order.getCustomer().getPhone());
                        String fullName = customerNameMap.get(order.getCustomer().getId());
                        if (fullName != null && !fullName.isEmpty()) {
                            dto.setCustomerName(fullName);
                        }
                    }
                    return dto;
                });
    }

    // Cập nhật trạng thái đơn hàng
    public Order updateOrderStatus(Integer orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String currentStatus = order.getStatus();

        switch (newStatus) {
            case "PREPARING" -> {
                if (!currentStatus.equals("PAID")) {
                    throw new RuntimeException(
                            "Trạng thái chuyển đổi không hợp lệ. Chỉ đơn hàng ở trạng thái PAID mới có thể chấp nhận thành PREPARING.");
                }
            }
            case "SHIPPING" -> {
                if (!currentStatus.equals("PREPARING")) {
                    throw new RuntimeException(
                            "Trạng thái chuyển đổi không hợp lệ. Chỉ đơn hàng ở trạng thái PREPARING mới có thể chuyển sang SHIPPING.");
                }
            }
            case "CANCELLED" -> {
                if (!currentStatus.equals("PAID")) {
                    throw new RuntimeException("Chỉ đơn hàng ở trạng thái PAID mới có thể chấp nhận/hủy bởi Owner.");
                }
            }

            case "COMPLETED" -> {
                if (!currentStatus.equals("SHIPPING")) {
                    throw new RuntimeException("Chỉ đơn hàng đang SHIPPING mới có thể chuyển sang COMPLETED.");
                }
            }

            default -> throw new RuntimeException("Trạng thái chuyển đổi không hợp lệ: " + newStatus);

        }

        order.setStatus(newStatus);

        Order savedOrder = orderRepository.save(order);
        return orderRepository.findByIdWithDetails(savedOrder.getId()).orElse(savedOrder);
    }

    public Order getOrderDetailsById(Integer orderId) {
        return orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + orderId));
    }

    public Order getOrderById(Integer orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }
}
