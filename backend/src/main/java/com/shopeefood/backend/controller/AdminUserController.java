package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.AdminCustomerResponse;
import com.shopeefood.backend.dto.AdminOwnerRestaurantResponse;
import com.shopeefood.backend.dto.AdminShipperResponse;
import com.shopeefood.backend.dto.AdminUserDetailResponse;
import com.shopeefood.backend.service.AdminUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private AdminUserService adminUserService;

    @GetMapping("/customers")
    public List<AdminCustomerResponse> getCustomers() {
        return adminUserService.getCustomers();
    }

    @GetMapping("/shippers")
    public List<AdminShipperResponse> getShippers() {
        return adminUserService.getShippers();
    }

    @GetMapping("/owners")
    public List<AdminOwnerRestaurantResponse> getOwners() {
        return adminUserService.getOwners();
    }

    @GetMapping("/{accountId}/detail")
    public ResponseEntity<AdminUserDetailResponse> getUserDetail(@PathVariable Integer accountId) {
        return ResponseEntity.ok(adminUserService.getUserDetail(accountId));
    }
}


