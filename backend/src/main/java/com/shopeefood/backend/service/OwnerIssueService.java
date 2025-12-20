package com.shopeefood.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.shopeefood.backend.dto.IssueDecisionRequest;
import com.shopeefood.backend.dto.IssueEventRequest;
import com.shopeefood.backend.dto.IssueResponseDTO;
import com.shopeefood.backend.entity.Issue;
import com.shopeefood.backend.entity.IssueEvent;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.IssueEventRepository;
import com.shopeefood.backend.repository.IssueRepository;
import com.shopeefood.backend.repository.OrderRepository;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

@Service
public class OwnerIssueService {

    @Autowired
    private IssueRepository issueRepository;
    @Autowired
    private IssueEventRepository eventRepository;
    @Autowired
    private OrderRepository orderRepository;

    /**
     * Tìm kiếm và lọc danh sách Khiếu nại - Đã sửa lỗi mapping DTO
     */
    public Page<IssueResponseDTO> findAll(Integer ownerId, Integer restaurantId, String status, String search,
            Pageable pageable) {
        Page<Issue> issuePage = issueRepository.findAll((root, query, cb) -> {
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
                        cb.like(cb.lower(root.get("order").get("orderNumber")), pattern),
                        cb.like(cb.lower(root.get("order").get("customerName").get("fullName")), pattern)));
            }

            // Tối ưu fetch dữ liệu
            if (query.getResultType() != Long.class) {
                root.fetch("order", JoinType.LEFT).fetch("customerName", JoinType.LEFT);
                root.fetch("order", JoinType.LEFT).fetch("customer", JoinType.LEFT);
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        }, pageable);

        // FIX: Trả về bản map sang DTO để tránh lỗi tuần hoàn
        return issuePage.map(IssueResponseDTO::new);
    }

    /**
     * Lấy lịch sử sự kiện của khiếu nại
     */
    public List<IssueEvent> getEventsByIssue(Integer issueId) {
        // FIX: Gọi đúng repository để lấy danh sách event theo issueId
        return eventRepository.findByIssueIdOrderByCreatedAtAsc(issueId);
    }

    @Transactional
    public IssueEvent addEvent(Integer issueId, IssueEventRequest req) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Issue ID: " + issueId));

        IssueEvent event = new IssueEvent();
        event.setIssueId(issueId);
        event.setAccountId(req.getAccountId());
        event.setAccountRole("OWNER");
        event.setEventType("MESSAGE");
        event.setContent(req.getContent());

        issue.setUpdatedAt(LocalDateTime.now());
        issueRepository.save(issue);

        return eventRepository.save(event);
    }

    /**
     * Xử lý quyết định của chủ quán - Trả về DTO để an toàn
     */
    @Transactional
    public IssueResponseDTO handleDecision(Integer issueId, IssueDecisionRequest req) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khiếu nại ID: " + issueId));

        Order order = orderRepository.findById(issue.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng."));

        String decision = (req.getDecision() == null ? "" : req.getDecision().trim().toUpperCase());
        String reason = (req.getResolvedReason() != null) ? req.getResolvedReason().trim() : "";

        issue.setStatus("CLOSED");
        issue.setResolvedAt(LocalDateTime.now());
        issue.setUpdatedAt(LocalDateTime.now());

        if ("APPROVED".equals(decision)) {
            issue.setOwnerRefundStatus("APPROVED");
            issue.setOwnerRefundAmount(req.getAmount());
            issue.setResolvedReason(!reason.isEmpty() ? reason : "Chủ quán đã duyệt hoàn tiền.");

            order.setStatus("REFUNDED");
            orderRepository.save(order);
        } else if ("REJECTED".equals(decision)) {
            if (reason.isEmpty()) {
                throw new IllegalArgumentException("Bạn phải nhập lý do khi từ chối khiếu nại.");
            }
            issue.setOwnerRefundStatus("REJECTED");
            issue.setOwnerRefundAmount(java.math.BigDecimal.ZERO);
            issue.setResolvedReason(reason);
        }

        // Ghi log vào Timeline
        IssueEvent event = new IssueEvent();
        event.setIssueId(issueId);
        event.setAccountId(req.getAccountId());
        event.setAccountRole("OWNER");
        event.setEventType("OWNER_REFUND");
        event.setContent(issue.getResolvedReason());
        event.setAmount(issue.getOwnerRefundAmount());
        event.setNewValue(decision);
        eventRepository.save(event);

        Issue savedIssue = issueRepository.save(issue);
        return new IssueResponseDTO(savedIssue);
    }
}