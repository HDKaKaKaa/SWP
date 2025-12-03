package com.shopeefood.backend.controller;

import java.util.List;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Product;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.service.OwnerDashboardService;

@RestController
@RequestMapping("/api/owner")
public class OwnerDashboardController {

    private final OwnerDashboardService dashboardService;

    public OwnerDashboardController(OwnerDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/restaurants")
    public List<Restaurant> getRestaurants(@RequestParam Integer ownerId) {
        return dashboardService.getRestaurantsByOwner(ownerId);
    }

    @GetMapping("/products")
    public List<Product> getProducts(@RequestParam Integer restaurantId) {
        return dashboardService.getProductsByRestaurant(restaurantId);
    }

    @GetMapping("/orders")
    public List<Order> getOrders(@RequestParam Integer restaurantId) {
        return dashboardService.getOrdersByRestaurant(restaurantId);
    }

    @GetMapping("/reports/summary")
    public OwnerDashboardService.DashboardReport getReport(@RequestParam Integer restaurantId) {
        return dashboardService.getReportByRestaurant(restaurantId);
    }
}
