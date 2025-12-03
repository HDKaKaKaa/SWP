package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/accounts")
public class AdminAccountController {

    @Autowired
    private AccountRepository accountRepository;

    /**
     * Lấy danh sách tất cả tài khoản
     * GET: /api/admin/accounts
     */
    @GetMapping
    public ResponseEntity<?> getAllAccounts() {
        List<Account> accounts = accountRepository.findAll()
                .stream()
                .filter(account -> account.getRole() == null
                        || !account.getRole().equalsIgnoreCase("ADMIN"))
                .toList();

        return ResponseEntity.ok(accounts);
    }

    /**
     * Vô hiệu hóa tài khoản
     * PUT: /api/admin/accounts/{accountId}/deactivate
     */
    @PutMapping("/{accountId}/deactivate")
    public ResponseEntity<?> deactivateAccount(@PathVariable Integer accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        // Không cho khóa tài khoản Admin
        if (account.getRole() != null && account.getRole().equalsIgnoreCase("ADMIN")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Không thể vô hiệu hóa tài khoản Admin");
        }

        // Nếu đã ở trạng thái FALSE rồi thì thôi
        if (Boolean.FALSE.equals(account.getIsActive())) {
            return ResponseEntity.ok("Tài khoản đã ở trạng thái vô hiệu hóa");
        }

        account.setIsActive(false);
        accountRepository.save(account);

        return ResponseEntity.ok("Đã vô hiệu hóa tài khoản thành công");
    }

    /**
     * Kích hoạt tài khoản
     * PUT: /api/admin/accounts/{accountId}/activate
     */
    @PutMapping( "/{accountId}/activate")
    public ResponseEntity<?> activateAccount(@PathVariable Integer accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        // Không thao tác với Admin
        if (account.getRole() != null && account.getRole().equalsIgnoreCase("ADMIN")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Không thể thao tác trạng thái tài khoản ADMIN");
        }

        if (Boolean.TRUE.equals(account.getIsActive())) {
            return ResponseEntity.ok("Tài khoản đã ở trạng thái hoạt động");
        }

        account.setIsActive(true);
        accountRepository.save(account);

        return ResponseEntity.ok("Đã kích hoạt lại tài khoản thành công");
    }
}
