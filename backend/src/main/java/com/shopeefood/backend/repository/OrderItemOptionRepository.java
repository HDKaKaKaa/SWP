package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.OrderItemOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, Integer> {
}
