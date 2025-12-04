package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.Date;

@Data
@Entity
@Table(name = "payment_gateways")
public class PaymentGateway {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @Column(unique = true)
    private String code;

    @Column(name = "api_endpoint")
    private String apiEndpoint;

    @Column(name = "api_key")
    private String apiKey;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}