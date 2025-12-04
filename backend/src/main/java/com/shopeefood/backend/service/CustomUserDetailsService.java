package com.shopeefood.backend.service;

import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private AccountRepository accountRepository; // Repository của bảng accounts

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Tìm user trong DB
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // In ra Console để DEBUG xem lấy được đúng thằng Admin chưa
        System.out.println("Found User: " + account.getUsername());
        System.out.println("Password in DB: " + account.getPassword());

        // Trả về đối tượng User của Spring Security
        return org.springframework.security.core.userdetails.User
                .withUsername(account.getUsername())
                .password(account.getPassword()) // Password này PHẢI LÀ MÃ HÓA BCRYPT ($2a$10$...)
                .roles(account.getRole()) // Role (ADMIN)
                .build();
    }
}
