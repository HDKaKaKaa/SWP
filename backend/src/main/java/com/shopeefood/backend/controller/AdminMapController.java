package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.MapLocationDTO;
import com.shopeefood.backend.service.AdminMapService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/map")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminMapController {

    @Autowired
    private AdminMapService adminMapService;

    // API lấy toàn bộ vị trí
    // URL: GET http://localhost:8080/api/admin/map/locations
    @GetMapping("/locations")
    public ResponseEntity<List<MapLocationDTO>> getAllLocations() {
        return ResponseEntity.ok(adminMapService.getAllLocations());
    }
}