package com.shopeefood.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendNewPasswordEmail(String toEmail, String newPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("hoangnguyen26804@gmail.com");
        message.setTo(toEmail);
        message.setSubject("Food Order - Cấp lại mật khẩu");
        message.setText("Xin chào,\n\nMật khẩu mới của bạn là: " + newPassword
                + "\n\nVui lòng đăng nhập và đổi lại mật khẩu ngay.");

        mailSender.send(message);
        System.out.println("Đã gửi mail thành công đến: " + toEmail);
    }
}