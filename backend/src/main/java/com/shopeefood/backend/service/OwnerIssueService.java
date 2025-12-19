package com.shopeefood.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.shopeefood.backend.dto.IssueEventRequest;
import com.shopeefood.backend.entity.Issue;
import com.shopeefood.backend.entity.IssueEvent;
import com.shopeefood.backend.repository.IssueEventRepository;
import com.shopeefood.backend.repository.IssueRepository;
import com.shopeefood.backend.repository.OrderRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class OwnerIssueService {

    @Autowired private IssueRepository issueRepository;
    @Autowired private IssueEventRepository eventRepository;
    @Autowired private OrderRepository orderRepository;

    /**
     * Tìm kiếm và lọc danh sách Khiếu nại (Giữ nguyên từ code cũ)
     */
    public Page<Issue> findAll(Integer ownerId, Integer restaurantId, String status, String search, Pageable pageable) {
        return issueRepository.findAll((root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("assignedOwnerId"), ownerId));

            if (restaurantId != null) {
                predicates.add(cb.equal(root.get("targetType"), "RESTAURANT"));
                predicates.add(cb.equal(root.get("targetId"), restaurantId));
            }

            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isEmpty()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("code")), pattern),
                    cb.like(cb.lower(root.get("title")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        }, pageable);
    }

    /**
     * Lấy luồng sự kiện (Timeline) (Giữ nguyên từ code cũ)
     */
    public List<IssueEvent> getEventsByIssue(Integer issueId) {
        return eventRepository.findByIssueIdOrderByCreatedAtAsc(issueId);
    }

    /**
     * Thêm phản hồi hoặc xử lý hoàn tiền (Cập nhật logic khớp DB Schema)
     */
    @Transactional
    public IssueEvent addEvent(Integer issueId, IssueEventRequest req) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Issue ID: " + issueId));

        IssueEvent event = new IssueEvent();
        event.setIssueId(issueId);
        event.setAccountId(req.getAccountId());
        event.setAccountRole("OWNER");
        event.setEventType(req.getEventType());
        event.setContent(req.getContent());
        event.setAmount(req.getAmount());
        event.setCreatedAt(LocalDateTime.now());

        // LOGIC XỬ LÝ TRẠNG THÁI KHỚP SCHEMA
        if ("OWNER_REFUND".equals(req.getEventType())) {
            // 1. Cập nhật Issue: Chuyển thành CLOSED và APPROVED hoàn tiền
            issue.setStatus("CLOSED"); 
            issue.setOwnerRefundStatus("APPROVED");
            issue.setOwnerRefundAmount(req.getAmount());
            issue.setResolvedAt(LocalDateTime.now());
            issue.setResolvedReason("Chủ cửa hàng đã chấp nhận hoàn tiền.");

            // 2. Cập nhật Order: Chuyển thành REFUNDED
            if (issue.getOrderId() != null) {
                orderRepository.findById(issue.getOrderId()).ifPresent(order -> {
                    order.setStatus("REFUNDED");
                    orderRepository.save(order);
                });
            }

            if (event.getContent() == null || event.getContent().isEmpty()) {
                event.setContent("Hệ thống: Đã phê duyệt hoàn tiền " + req.getAmount() + "đ. Đơn hàng và khiếu nại đã đóng.");
            }
        } 
        else if ("REJECT".equals(req.getEventType())) {
            // Trường hợp chủ nhà hàng từ chối xử lý
            issue.setStatus("CLOSED");
            issue.setOwnerRefundStatus("REJECTED");
            issue.setResolvedAt(LocalDateTime.now());
            issue.setResolvedReason("Chủ cửa hàng từ chối: " + req.getContent());
            
            // Event type phải thuộc ARRAY đã định nghĩa trong DB, chuyển về MESSAGE để lưu history
            event.setEventType("MESSAGE"); 
        }

        issue.setUpdatedAt(LocalDateTime.now());
        issueRepository.save(issue);
        return eventRepository.save(event);
    }
}