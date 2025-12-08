package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/owner/restaurants")
@CrossOrigin(origins = "http://localhost:5173")
public class OwnerRestaurantController {
    @Autowired
    private RestaurantRepository restaurantRepository;

    @GetMapping
    public List<Restaurant> getRestaurantsByOwnerId(@RequestParam Integer ownerId) {
        return restaurantRepository.findByOwnerId(ownerId);
    }

}
