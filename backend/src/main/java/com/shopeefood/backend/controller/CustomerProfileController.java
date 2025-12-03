package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.CustomerProfileResponse;
import com.shopeefood.backend.dto.CustomerProfileUpdateRequest;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.repository.AccountRepository;
import com.shopeefood.backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@RestController
@RequestMapping("/api/customer/profile")
@CrossOrigin(origins = "http://localhost:5173")
public class CustomerProfileController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    /**
     * Lấy thông tin tài khoản + thông tin customer
     * GET /api/customer/profile/{accountId}
     */
    @GetMapping("/{accountId}")
    public ResponseEntity<CustomerProfileResponse> getProfile(
            @PathVariable Integer accountId) {

        Account acc = accountRepository.findById(accountId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        // Nếu chưa có record customer thì trả rỗng các trường customer
        Customer customer = customerRepository.findById(accountId)
                .orElseGet(() -> {
                    Customer c = new Customer();
                    c.setAccountId(accountId);
                    return c;
                });

        CustomerProfileResponse res = new CustomerProfileResponse();
        res.setAccountId(acc.getId());
        res.setUsername(acc.getUsername());
        res.setRole(acc.getRole());

        res.setEmail(acc.getEmail());
        res.setPhone(acc.getPhone());

        res.setFullName(customer.getFullName());
        res.setAddress(customer.getAddress());
        res.setLatitude(customer.getLatitude());
        res.setLongitude(customer.getLongitude());

        return ResponseEntity.ok(res);
    }

    /**
     * Cập nhật thông tin tài khoản + customer
     * PUT /api/customer/profile/{accountId}
     */
    @PutMapping("/{accountId}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Integer accountId,
            @RequestBody CustomerProfileUpdateRequest request) {

        Account acc = accountRepository.findById(accountId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        // Check email không bị trùng với tài khoản khác
        if (request.getEmail() != null) {
            Optional<Account> sameEmailAcc = accountRepository.findByEmail(request.getEmail());
            if (sameEmailAcc.isPresent()
                    && !sameEmailAcc.get().getId().equals(accountId)) {
                return ResponseEntity.badRequest().body("Email đã được sử dụng bởi tài khoản khác");
            }
        }

        // --------- cập nhật bảng accounts ----------
        if (request.getEmail() != null) {
            acc.setEmail(request.getEmail());
        }
        acc.setPhone(request.getPhone());
        accountRepository.save(acc);

        // --------- cập nhật bảng customers ----------
        Customer customer = customerRepository.findById(accountId)
                .orElseGet(() -> {
                    Customer c = new Customer();
                    c.setAccountId(accountId);
                    return c;
                });

        customer.setFullName(request.getFullName());
        customer.setAddress(request.getAddress());
        customer.setLatitude(request.getLatitude());
        customer.setLongitude(request.getLongitude());
        customerRepository.save(customer);

        return ResponseEntity.ok("Cập nhật thông tin thành công");
    }
}

