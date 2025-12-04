package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "admins")
public class Admin {
    @Id
    @Column(name = "account_id")
    private Integer accountId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @OneToOne
    @MapsId
    @JoinColumn(name = "account_id")
    private Account account;
}