package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.ChangePasswordRequest;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        // 1. Kiểm tra dữ liệu rỗng thủ công (Không cần thư viện)
        if (request.getAccountId() == null) {
            throw new RuntimeException("Thiếu ID tài khoản!");
        }
        if (request.getOldPassword() == null || request.getOldPassword().isEmpty()) {
            throw new RuntimeException("Chưa nhập mật khẩu cũ!");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
            throw new RuntimeException("Chưa nhập mật khẩu mới!");
        }

        // 2. Tìm Account theo ID gửi lên
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // 3. Kiểm tra mật khẩu cũ
        if (!passwordEncoder.matches(request.getOldPassword(), account.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác!");
        }

        // 4. Kiểm tra xác nhận mật khẩu
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu xác nhận không khớp!");
        }

        // 5. Lưu mật khẩu mới
        account.setPassword(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);
    }
}