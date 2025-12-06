package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Integer> {
    Optional<Transaction> findByTransactionCode (String transactionCode);

    List<Transaction> findByOrder(Order order);
}