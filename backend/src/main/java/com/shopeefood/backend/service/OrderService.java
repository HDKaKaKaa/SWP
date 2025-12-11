package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    // Lấy đơn hàng cho Owner, với filter: restaurant, search, from-to, page-size
    public Page<OrderDTO> getOrdersForOwner(Integer ownerId, Integer restaurantId,
            int page, int size, String search,
            LocalDateTime from, LocalDateTime to, String sortField, String sortDir) {
        List<String> allowedStatuses = List.of("PAID", "SHIPPING", "COMPLETED", "CANCELLED");
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

        Page<Order> orderPage = orderRepository.findOrdersByOwnerAndRestaurant(
                ownerId,
                restaurantId,
                searchPattern,
                from,
                to,
                allowedStatuses,
                pageable);
        return orderPage.map(OrderDTO::new);
    }

    // Cập nhật trạng thái đơn hàng
    public Order updateOrderStatus(Integer orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String currentStatus = order.getStatus();

        switch (newStatus) {
            case "SHIPPING":
            case "CANCELLED":
                if (!currentStatus.equals("PAID")) {
                    throw new RuntimeException("Chỉ đơn hàng ở trạng thái PAID mới có thể chấp nhận/hủy bởi Owner.");
                }
                break;

            case "COMPLETED":
                if (!currentStatus.equals("SHIPPING")) {
                    throw new RuntimeException("Chỉ đơn hàng đang SHIPPING mới có thể chuyển sang COMPLETED.");
                }
                break;

            default:
                throw new RuntimeException("Trạng thái chuyển đổi không hợp lệ: " + newStatus);

        }

        order.setStatus(newStatus);

        Order savedOrder = orderRepository.save(order);
        return orderRepository.findByIdWithDetails(savedOrder.getId()).orElse(savedOrder);
    }

    public Order getOrderById(Integer orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }
}
