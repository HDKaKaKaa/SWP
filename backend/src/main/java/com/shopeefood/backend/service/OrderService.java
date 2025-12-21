package com.shopeefood.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.CustomerRepository;
import com.shopeefood.backend.repository.OrderRepository;

@Service
@Transactional(readOnly = true)
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private CustomerRepository customerRepository;

    public Page<OrderDTO> getOrdersForOwner(Integer ownerId, Integer restaurantId, String status,
            int page, int size, String search,
            LocalDateTime from, LocalDateTime to,
            String sortField, String sortDir) {

        // 1. Chuẩn hóa bộ lọc status
        List<String> allowedStatuses = (status != null && !status.isBlank() && !status.equals("ALL"))
                ? List.of(status)
                : List.of("PENDING", "PAID", "PREPARING", "SHIPPING", "COMPLETED", "CANCELLED", "REFUNDED");

        String searchPattern = (search != null && !search.trim().isEmpty())
                ? "%" + search.trim().toLowerCase() + "%"
                : null;

        // 2. Thiết lập phân trang và sắp xếp
        Sort sort = (sortField == null || sortField.isBlank())
                ? Sort.by(Sort.Direction.DESC, "createdAt")
                : Sort.by(sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortField);

        Pageable pageable = PageRequest.of(page, size, sort);

        // 3. BƯỚC 1: Gọi đúng tên hàm trong Repository của bạn
        // Vì Repo trả về Page<Order>, ta lấy danh sách ID từ trang đó
        Page<Order> ordersPage = orderRepository.findOrderIdsByOwnerAndRestaurant(
                ownerId, restaurantId, searchPattern, from, to, allowedStatuses, pageable);

        if (ordersPage.isEmpty())
            return Page.empty(pageable);

        List<Integer> orderIds = ordersPage.getContent().stream()
                .map(Order::getId)
                .collect(Collectors.toList());

        // 4. BƯỚC 2: Fetch chi tiết (để lấy OrderItems, Restaurant, CustomerProfile)
        List<Order> ordersWithDetails = orderRepository.findOrdersWithDetailsByIds(orderIds);

        // 5. Mapping sang DTO và xử lý fullName
        Map<Integer, Order> orderMap = ordersWithDetails.stream()
                .collect(Collectors.toMap(Order::getId, Function.identity()));

        List<OrderDTO> dtos = orderIds.stream()
                .map(id -> {
                    Order order = orderMap.get(id);
                    OrderDTO dto = new OrderDTO(order);

                    if (order.getCustomer() != null) {
                        dto.setCustomerPhone(order.getCustomer().getPhone());

                        // Sửa lỗi getFullName(): Truy cập qua CustomerProfile
                        if (order.getCustomer().getCustomerProfile() != null) {
                            dto.setCustomerName(order.getCustomer().getCustomerProfile().getFullName());
                        } else {
                            dto.setCustomerName(order.getCustomer().getUsername()); // Fallback
                        }
                    }
                    return dto;
                })
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, ordersPage.getTotalElements());
    }

    @Transactional
    public Order updateOrderStatus(Integer orderId, String newStatus) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng ID: " + orderId));

        validateStatusTransition(order.getStatus(), newStatus);
        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    public Order getOrderDetailsById(Integer orderId) {
        return orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết đơn hàng"));
    }

    private void validateStatusTransition(String current, String next) {
        boolean isValid = switch (next) {
            case "PREPARING", "CANCELLED" -> "PAID".equals(current);
            case "SHIPPING" -> "PREPARING".equals(current);
            case "COMPLETED" -> "SHIPPING".equals(current);
            default -> false;
        };
        if (!isValid)
            throw new RuntimeException("Trạng thái chuyển đổi không hợp lệ: " + current + " -> " + next);
    }
}