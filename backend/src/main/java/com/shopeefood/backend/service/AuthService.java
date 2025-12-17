package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.RegisterRequest;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.repository.AccountRepository;
import com.shopeefood.backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public void registerCustomer(RegisterRequest request) {
        if (accountRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username đã tồn tại");
        }
        if (accountRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email này đã được sử dụng!");
        }
        if (request.getPhone() != null && accountRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Số điện thoại này đã được đăng ký!");
        }

        Account newAcc = new Account();
        newAcc.setUsername(request.getUsername());
        newAcc.setPassword(passwordEncoder.encode(request.getPassword()));
        newAcc.setEmail(request.getEmail());
        newAcc.setPhone(request.getPhone());
        newAcc.setRole("CUSTOMER");
        newAcc.setIsActive(true);

        Account savedAccount = accountRepository.save(newAcc);

        Customer newCustomer = new Customer();
        newCustomer.setAccount(savedAccount);
        newCustomer.setFullName(request.getFullName());

        customerRepository.save(newCustomer);
    }
}