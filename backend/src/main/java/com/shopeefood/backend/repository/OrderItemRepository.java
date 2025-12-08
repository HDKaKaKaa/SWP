package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.OrderItem;
import com.shopeefood.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    // Tìm item theo order + product
    Optional<OrderItem> findByOrderAndProduct(Order order, Product product);

    // Lấy toàn bộ item của 1 order
    List<OrderItem> findByOrder(Order order);

    List<OrderItem> findAllByOrderAndProduct(Order order, Product product);
}
