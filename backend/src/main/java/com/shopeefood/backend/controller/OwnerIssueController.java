package com.shopeefood.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shopeefood.backend.dto.IssueEventRequest;
import com.shopeefood.backend.entity.Issue;
import com.shopeefood.backend.entity.IssueEvent;
import com.shopeefood.backend.service.OwnerIssueService;

@RestController
@RequestMapping("/api/owner/issues")
@CrossOrigin(origins = "*") // Cho phép React gọi API
public class OwnerIssueController {

    @Autowired 
    private OwnerIssueService issueService;

    /**
     * Lấy danh sách khiếu nại có phân trang và lọc
     */
    @GetMapping
    public ResponseEntity<Page<Issue>> getIssues(
            @RequestParam Integer ownerId,
            @RequestParam(required = false) Integer restaurantId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        // Sắp xếp theo updatedAt mới nhất để chủ cửa hàng thấy cái mới xử lý lên đầu
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        return ResponseEntity.ok(issueService.findAll(ownerId, restaurantId, status, search, pageable));
    }

    /**
     * Lấy lịch sử trao đổi (Timeline) của một khiếu nại
     */
    @GetMapping("/{id}/events")
    public ResponseEntity<List<IssueEvent>> getEvents(@PathVariable Integer id) {
        return ResponseEntity.ok(issueService.getEventsByIssue(id));
    }

    /**
     * Xử lý hành động: Gửi tin nhắn, Hoàn tiền hoặc Từ chối
     */
    @PostMapping("/{id}/events")
    public ResponseEntity<IssueEvent> postEvent(
            @PathVariable Integer id,
            @RequestBody IssueEventRequest request) {
        // Logic status đã được đóng gói trong issueService.addEvent
        return ResponseEntity.ok(issueService.addEvent(id, request));
    }
}