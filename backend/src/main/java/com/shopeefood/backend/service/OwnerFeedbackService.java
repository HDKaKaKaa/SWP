package com.shopeefood.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.shopeefood.backend.dto.OwnerFeedbackDTO;
import com.shopeefood.backend.dto.RestaurantFilterDTO;
import com.shopeefood.backend.entity.Feedback;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.repository.FeedbackRepository;
import com.shopeefood.backend.repository.RestaurantRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OwnerFeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final RestaurantRepository restaurantRepository;

    // --- 1. Lấy danh sách Nhà hàng của Owner
    @Transactional(readOnly = true)
    public List<RestaurantFilterDTO> getRestaurantsByOwner(Integer ownerId) {
        List<Restaurant> restaurants = restaurantRepository.findByOwnerAccountId(ownerId);
        return restaurants.stream()
                .map(r -> new RestaurantFilterDTO(r.getId(), r.getName()))
                .collect(Collectors.toList());
    }

    // --- 2. Lấy danh sách Feedback
    @Transactional(readOnly = true)
    public Page<OwnerFeedbackDTO> getFeedbacksByOwner(Integer ownerId, Integer restaurantId,
            String searchKeyword, LocalDate startDate, LocalDate endDate, Pageable pageable) {

        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59) : null;
        Sort currentSort = pageable.getSort();
        Sort newSort = Sort.unsorted();

        for (Sort.Order order : currentSort) {
            String propertyName = order.getProperty();
            String sqlColumnName;
            switch (propertyName) {
                case "createdAt":
                    sqlColumnName = "feedbackCreatedAt";
                    break;
                case "rating":
                    sqlColumnName = "feedbackRating";
                    break;
                case "orderId":
                    sqlColumnName = "orderIdCol";
                    break;
                default:
                    // Giữ nguyên các thuộc tính không được ánh xạ rõ ràng
                    sqlColumnName = propertyName;
            }

            newSort = newSort.and(Sort.by(order.getDirection(), sqlColumnName));
        }

        // Tạo Pageable mới với Sort đã được ánh xạ (quan trọng!)
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), newSort);
        // 🌟 END FIX 🌟

        Page<Feedback> feedbackPage = feedbackRepository.findFilteredFeedbacksByOwner(
                ownerId,
                restaurantId,
                searchKeyword,
                startDateTime,
                endDateTime,
                sortedPageable);

        return feedbackPage.map(this::convertToDTO);
    }

    private OwnerFeedbackDTO convertToDTO(Feedback feedback) {
        return new OwnerFeedbackDTO(feedback);
    }

    // --- 3. Lấy chi tiết Feedback (Không cần sửa lỗi) ---
    public OwnerFeedbackDTO getFeedbackById(Integer feedbackId, Integer ownerId) {

        Feedback feedback = feedbackRepository.findByIdAndRestaurantOwnerAccountId(feedbackId, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Feedback not found or access denied for id: " + feedbackId));

        return convertToDTO(feedback);
    }

}