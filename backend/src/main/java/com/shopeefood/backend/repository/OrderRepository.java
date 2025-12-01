package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {
    // Hàm tìm đơn hàng của một khách hàng (Để sau này làm trang Lịch sử đơn hàng)
    List<Order> findByCustomerId(Integer customerId);
}