package com.shopeefood.backend.service;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    // Lấy đơn hàng cho Owner, với filter: restaurant, search, from-to, page-size
    public Page<Order> getOrdersForOwner(Integer ownerId, Integer restaurantId,
                                         int page, int size, String search,
                                         LocalDateTime from, LocalDateTime to) {
        if (from == null) from = LocalDateTime.MIN;
        if (to == null) to = LocalDateTime.now();
        if (search == null) search = "";

        return orderRepository.findOrdersByOwnerAndRestaurant(
                ownerId,
                restaurantId,
                search.toLowerCase(),
                from,
                to,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
    }

    // Cập nhật trạng thái đơn hàng (Owner action)
    public void updateOrderStatus(Integer orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String currentStatus = order.getStatus();

        switch (currentStatus) {
            case "PENDING":
                if (!newStatus.equals("PREPARING") && !newStatus.equals("CANCELLED")) {
                    throw new RuntimeException("Invalid transition from PENDING");
                }
                break;
            case "PREPARING":
                if (!newStatus.equals("SHIPPING")) {
                    throw new RuntimeException("Invalid transition from PREPARING");
                }
                break;
            default:
                throw new RuntimeException("No action allowed from status: " + currentStatus);
        }

        order.setStatus(newStatus);
        orderRepository.save(order);
    }
}
