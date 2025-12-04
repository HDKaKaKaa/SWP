package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Integer> {
    Optional<Account> findByUsername(String username);

    Optional<Account> findByEmail(String email);

    Optional<Account> findByUsernameOrEmail(String username, String email);
}