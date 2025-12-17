package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.ShipperOrderHistoryDTO;
import com.shopeefood.backend.dto.ShipperPerformanceDTO;
import com.shopeefood.backend.service.AdminShipperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/shippers")
public class AdminShipperController {

    @Autowired
    private AdminShipperService adminShipperService;

    @GetMapping
    public ResponseEntity<List<ShipperPerformanceDTO>> getAllShippers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean status,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        // Truyền đủ 2 tham số xuống Service
        return ResponseEntity.ok(adminShipperService.getShipperList(keyword, status, startDate, endDate));
    }

    @PutMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable Integer id) {
        try {
            adminShipperService.toggleShipperStatus(id);
            return ResponseEntity.ok("Cập nhật trạng thái thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 3. Lấy lịch sử giao hàng (BẠN ĐANG THIẾU HÀM NÀY)
    @GetMapping("/{id}/history")
    public ResponseEntity<List<ShipperOrderHistoryDTO>> getShipperHistory(
            @PathVariable Integer id,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        return ResponseEntity.ok(adminShipperService.getShipperHistory(id, startDate, endDate));
    }
}