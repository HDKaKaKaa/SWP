package com.shopeefood.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shopeefood.backend.dto.OwnerDashboardResponse;
import com.shopeefood.backend.service.OwnerDashboardService;

@RestController
@RequestMapping("/api/owner/dashboard")
@CrossOrigin("*")
public class OwnerDashboardController {

    @Autowired private OwnerDashboardService ownerDashboardService;

    @GetMapping("/all-data")
    public OwnerDashboardResponse getDashboardData(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return ownerDashboardService.getFullDashboardData(ownerId, restaurantId, startDate, endDate);
    }
}