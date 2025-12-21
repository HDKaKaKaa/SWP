package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonBackReference;

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

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "account_id")
    @JsonBackReference
    private Account account;
    
    // Các trường khác có thể null thì không cần bắt buộc set ngay
    private String address;
    private Double latitude;
    private Double longitude;
}