package com.shopeefood.backend.entity;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "owners")
public class Owner {
    @Id
    @Column(name = "account_id")
    private Integer accountId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "id_card_number")
    private String idCardNumber;

    @OneToMany(mappedBy = "owner")
    @JsonIgnore
    private List<Restaurant> restaurants;

    @OneToOne
    @MapsId
    @JoinColumn(name = "account_id")
    private Account account;

    public Integer getId() {
        return accountId;
    }

}