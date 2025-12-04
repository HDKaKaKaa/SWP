package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Shipper;
import com.shopeefood.backend.repository.AccountRepository;
import com.shopeefood.backend.repository.ShipperRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class TestDataController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private ShipperRepository shipperRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Tạo tài khoản shipper test
     * POST: http://localhost:8080/api/test/create-shipper
     */
    @PostMapping("/create-shipper")
    public ResponseEntity<?> createTestShipper() {
        try {
            // Kiểm tra xem đã có shipper01 chưa
            if (accountRepository.findByUsername("shipper01").isPresent()) {
                return ResponseEntity.badRequest().body("Tài khoản shipper01 đã tồn tại!");
            }

            // 1. Tạo Account
            Account account = new Account();
            account.setUsername("shipper01");
            account.setPassword(passwordEncoder.encode("shipper123")); // Password: shipper123
            account.setEmail("shipper01@example.com");
            account.setPhone("0901234567");
            account.setRole("SHIPPER");
            account.setIsActive(true);

            Account savedAccount = accountRepository.save(account);

            // 2. Tạo Shipper
            Shipper shipper = new Shipper();
            shipper.setAccountId(savedAccount.getId());
            shipper.setFullName("Nguyễn Văn Shipper");
            shipper.setLicensePlate("30A-12345");
            shipper.setVehicleType("Xe máy");
            shipper.setCurrentLat(21.0285); // Hà Nội
            shipper.setCurrentLong(105.8542);
            shipper.setStatus("OFFLINE");

            shipperRepository.save(shipper);

            return ResponseEntity.ok("Tạo tài khoản shipper thành công!\n" +
                    "Username: shipper01\n" +
                    "Password: shipper123\n" +
                    "Email: shipper01@example.com");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi tạo shipper: " + e.getMessage());
        }
    }
}



