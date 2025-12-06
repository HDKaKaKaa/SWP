package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.PaymentGateway;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentGatewayRepository extends JpaRepository<PaymentGateway, Integer> {

    Optional<PaymentGateway> findByCode(String code);
}