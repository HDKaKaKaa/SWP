package com.shopeefood.backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shopeefood.backend.dto.OwnerFeedbackDTO;
import com.shopeefood.backend.dto.RestaurantFilterDTO;
import com.shopeefood.backend.service.OwnerFeedbackService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/owner/feedbacks")
@RequiredArgsConstructor
public class OwnerFeedbackController {

    private final OwnerFeedbackService ownerFeedbackService;

    // Endpoint 1: Lấy danh sách Nhà hàng (SỬA ĐỔI để nhận ownerId)
    @GetMapping("/restaurants")
    public List<RestaurantFilterDTO> getOwnerRestaurantsForFilter(@RequestParam Integer ownerId) {
        // Truyền ownerId nhận được từ tham số query vào Service
        return ownerFeedbackService.getRestaurantsByOwner(ownerId);
    }

    // Endpoint 2: Lấy danh sách Feedback (SỬA ĐỔI để nhận ownerId)
    @GetMapping
    public Page<OwnerFeedbackDTO> getFeedbacks(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam(required = false) String searchKeyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        // Truyền ownerId nhận được vào Service
        return ownerFeedbackService.getFeedbacksByOwner(
                ownerId,
                restaurantId,
                searchKeyword,
                startDate,
                endDate,
                pageable);
    }

    // Endpoint 3: Xem chi tiết (Chỉ cần kiểm tra quyền sở hữu dựa trên feedbackId
    // và ownerId)
    @GetMapping("/{feedbackId}")
    public OwnerFeedbackDTO getFeedbackDetail(@PathVariable Integer feedbackId, @RequestParam Integer ownerId) {
        // Truyền ownerId nhận được vào Service
        return ownerFeedbackService.getFeedbackById(feedbackId, ownerId);
    }
}