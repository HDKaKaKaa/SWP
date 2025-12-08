package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "shippers")
public class Shipper {
    @Id
    @Column(name = "account_id")
    private Integer accountId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "license_plate")
    private String licensePlate;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "current_lat")
    private Double currentLat;

    @Column(name = "current_long")
    private Double currentLong;

    // Trạng thái: OFFLINE, ONLINE, BUSY
    private String status;

    @OneToOne
    @MapsId
    @JoinColumn(name = "account_id")
    private Account account;
}