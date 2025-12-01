package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "customers")
public class Customer {
    // Vì bảng customers dùng account_id làm khóa chính (Primary Key) nên ta không
    // dùng @GeneratedValue (Tự tăng) mà sẽ set thủ công bằng ID của Account
    @Id
    @Column(name = "account_id")
    private Integer accountId;

    @Column(name = "full_name")
    private String fullName;

    // Các trường khác có thể null thì không cần bắt buộc set ngay
    private String address;
    private Double latitude;
    private Double longitude;
}