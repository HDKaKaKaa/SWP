package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.repository.CustomerRepository;

import com.shopeefood.backend.dto.LoginRequest;
import com.shopeefood.backend.dto.RegisterRequest;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.repository.AccountRepository;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.shopeefood.backend.service.EmailService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private EmailService emailService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 1. Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Account account = accountRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElse(null);

        // Dùng hàm matches để so sánh password thô (request) và password mã hóa (DB)
        if (account != null && passwordEncoder.matches(request.getPassword(), account.getPassword())) {
            return ResponseEntity.ok(account);
        }
        return ResponseEntity.status(401).body("Sai tài khoản hoặc mật khẩu");
    }

    // 2. Đăng ký
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (accountRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username đã tồn tại");
        }

        // 1. Lưu vào bảng Account trước
        Account newAcc = new Account();
        newAcc.setUsername(request.getUsername());
        newAcc.setPassword(passwordEncoder.encode(request.getPassword()));
        newAcc.setEmail(request.getEmail());
        newAcc.setPhone(request.getPhone());
        newAcc.setRole("CUSTOMER");

        // Lưu Account và lấy về đối tượng đã có ID
        Account savedAccount = accountRepository.save(newAcc);

        // 2. Lưu tiếp vào bảng Customer (Lấy ID của Account vừa tạo)
        Customer newCustomer = new Customer();
        newCustomer.setAccountId(savedAccount.getId()); // ID Customer = ID Account
        newCustomer.setFullName(request.getFullName()); // Lấy họ tên từ form đăng ký

        customerRepository.save(newCustomer);

        return ResponseEntity.ok("Đăng ký thành công");
    }

    // 3. Quên mật khẩu
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Account account = accountRepository.findByEmail(email).orElse(null);

        if (account == null) {
            return ResponseEntity.badRequest().body("Email không tồn tại trong hệ thống");
        }

        // Tạo mật khẩu ngẫu nhiên (ví dụ lấy 6 ký tự đầu của thời gian hiện tại cho đơn
        // giản)
        String newPassword = String.valueOf(System.currentTimeMillis()).substring(0, 6);

        // Lưu mật khẩu mới vào DB
        account.setPassword(passwordEncoder.encode(newPassword));
        accountRepository.save(account);

        // GỬI EMAIL
        try {
            emailService.sendNewPasswordEmail(email, newPassword);
            return ResponseEntity.ok("Mật khẩu mới đã được gửi vào email của bạn. Vui lòng kiểm tra.");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi gửi email: " + e.getMessage());
        }
    }
}