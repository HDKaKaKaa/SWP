package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.*;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Issue;
import com.shopeefood.backend.entity.IssueEvent;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.entity.Owner;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Shipper;
import com.shopeefood.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueRepository issueRepository;
    private final IssueEventRepository issueEventRepository;
    private final OrderRepository orderRepository;
    private final AccountRepository accountRepository;

    // ----------------------------
    // Helpers
    // ----------------------------
    private Account getAccount(Integer accountId) {
        if (accountId == null) throw new IllegalArgumentException("actorId is required");
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Actor not found: " + accountId));
    }

    private static String normalizeRole(String role) {
        if (role == null) return "";
        return role.trim().toUpperCase(Locale.ROOT).replace("ROLE_", "");
    }

    private static boolean isOwnerCategory(String c) {
        return Set.of("FOOD", "ITEM", "RESTAURANT").contains(c);
    }

    private static boolean isDeliveryCategory(String c) {
        return Set.of("DELIVERY", "SHIPPER_BEHAVIOR", "SAFETY").contains(c);
    }

    private void validateOtherFields(IssueCreateRequest req) {
        if (req.getCategory() == null || req.getCategory().trim().isEmpty()) {
            throw new IllegalArgumentException("category is required");
        }
        if (req.getTargetType() == null || req.getTargetType().trim().isEmpty()) {
            throw new IllegalArgumentException("targetType is required");
        }
        if ("OTHER".equalsIgnoreCase(req.getCategory())) {
            if (req.getOtherCategory() == null || req.getOtherCategory().trim().isEmpty()) {
                throw new IllegalArgumentException("otherCategory is required when category=OTHER");
            }
        }
//        if ("OTHER".equalsIgnoreCase(req.getTargetType())) {
//            if (req.getTargetNote() == null || req.getTargetNote().trim().isEmpty()) {
//                throw new IllegalArgumentException("targetNote is required when targetType=OTHER");
//            }
//        }
    }

    private static Integer ownerAccountId(Restaurant restaurant) {
        if (restaurant == null) return null;
        Owner owner = restaurant.getOwner();
        if (owner == null) return null;
        return owner.getAccountId();
    }

    private static Integer shipperAccountId(Order order) {
        if (order == null) return null;
        Shipper s = order.getShipper();
        if (s == null) return null;
        return s.getAccountId();
    }

    private static String buildIssueCode(Integer id) {
        String ymd = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // yyyyMMdd
        return "ISS-" + ymd + "-" + String.format("%06d", id);
    }

    private IssueEvent event(Integer issueId, Account account, String eventType,
                             String content, String oldValue, String newValue,
                             BigDecimal amount, String attachmentUrl) {
        IssueEvent e = new IssueEvent();
        e.setIssueId(issueId);
        e.setAccountId(account.getId());
        e.setAccountRole(normalizeRole(account.getRole()));
        e.setEventType(eventType);
        e.setContent(content);
        e.setOldValue(oldValue);
        e.setNewValue(newValue);
        e.setAmount(amount);
        e.setAttachmentUrl(attachmentUrl);
        return e;
    }

    private void ensureCreatePermission(Account account, Order order) {
        String role = normalizeRole(account.getRole());
        Integer accountId = account.getId();

        if ("ADMIN".equals(role)) return;

        if ("CUSTOMER".equals(role)) {
            if (order.getCustomer() == null || !accountId.equals(order.getCustomer().getId())) {
                throw new SecurityException("CUSTOMER can only create issue for their own order");
            }
            return;
        }

        if ("SHIPPER".equals(role)) {
            Integer shipperId = shipperAccountId(order);
            if (shipperId == null || !accountId.equals(shipperId)) {
                throw new SecurityException("SHIPPER can only create issue for assigned order");
            }
            return;
        }

        if ("OWNER".equals(role)) {
            Integer ownerId = ownerAccountId(order.getRestaurant());
            if (ownerId == null || !accountId.equals(ownerId)) {
                throw new SecurityException("OWNER can only create issue for their restaurant orders");
            }
            return;
        }

        throw new SecurityException("Invalid role");
    }

    private void ensureAccess(Account account, Issue issue, Order order) {
        String role = normalizeRole(account.getRole());
        Integer actorId = account.getId();

        if ("ADMIN".equals(role)) return;

        // creator can always access
        if (actorId.equals(issue.getCreatedById())) return;

        if ("CUSTOMER".equals(role)) {
            if (order.getCustomer() != null && actorId.equals(order.getCustomer().getId())) return;
        }
        if ("SHIPPER".equals(role)) {
            Integer shipperId = shipperAccountId(order);
            if (shipperId != null && actorId.equals(shipperId)) return;
        }
        if ("OWNER".equals(role)) {
            Integer ownerId = ownerAccountId(order.getRestaurant());
            if (ownerId != null && actorId.equals(ownerId)) return;
        }

        throw new SecurityException("No access to this issue");
    }

    private void ensureAccessNoOrder(Account account, Issue issue) {
        String role = normalizeRole(account.getRole());
        Integer actorId = account.getId();

        if ("ADMIN".equals(role)) return;

        // creator can always access
        if (actorId.equals(issue.getCreatedById())) return;

        throw new SecurityException("No access to this issue");
    }

    // ----------------------------
    // Public APIs
    // ----------------------------

    @Transactional
    public Issue createIssue(IssueCreateRequest req) {
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("title is required");
        }
        validateOtherFields(req);

        Account account = getAccount(req.getAccountId());

        String category = req.getCategory().trim().toUpperCase(Locale.ROOT);
        String targetType = req.getTargetType().trim().toUpperCase(Locale.ROOT);

        boolean orderOptional = "SYSTEM".equals(targetType) || "OTHER".equals(targetType);

        Order order = null;
        if (req.getOrderId() != null) {
            order = orderRepository.findById(req.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + req.getOrderId()));

            // chỉ cho tạo issue khi đơn COMPLETED
            String st = (order.getStatus() == null) ? "" : order.getStatus().trim();
            if (!"COMPLETED".equalsIgnoreCase(st)) {
                throw new IllegalArgumentException("Only COMPLETED orders can create issues");
            }

            // complain shipper cần shipper
            if ("SHIPPER".equals(targetType) && order.getShipper() == null) {
                throw new IllegalArgumentException("Cannot complain SHIPPER: order has no shipper assigned");
            }

            ensureCreatePermission(account, order);
        } else {
            if (!orderOptional) {
                throw new IllegalArgumentException("orderId is required");
            }
            // không có order: chỉ cho CUSTOMER/ADMIN tạo (tránh shipper/owner spam system)
            String role = normalizeRole(account.getRole());
            if (!"CUSTOMER".equals(role) && !"ADMIN".equals(role)) {
                throw new SecurityException("Only CUSTOMER/ADMIN can create SYSTEM/OTHER issue without order");
            }
        }

        Issue issue = new Issue();
        issue.setCode("TMP-" + System.nanoTime());
        issue.setOrderId(order != null ? order.getId() : null);

        issue.setCreatedById(account.getId());
        issue.setCreatedByRole(normalizeRole(account.getRole()));

        issue.setTargetType(targetType);
        issue.setTargetId(req.getTargetId());
        issue.setTargetNote(req.getTargetNote());

        issue.setCategory(category);
        issue.setOtherCategory(req.getOtherCategory());
        issue.setTitle(req.getTitle());
        issue.setDescription(req.getDescription());

        issue.setStatus("OPEN");
        issue.setOwnerRefundStatus("NONE");
        issue.setAdminCreditStatus("NONE");

        // routing
        if (order == null) {
            // SYSTEM/OTHER không order => admin xử lý
            issue.setStatus("NEED_ADMIN_ACTION");
        } else {
            Integer ownerId = ownerAccountId(order.getRestaurant());
            if (isOwnerCategory(category) || "MIXED".equals(category)) {
                issue.setAssignedOwnerId(ownerId);
                issue.setStatus("NEED_OWNER_ACTION");
                issue.setOwnerRefundStatus("PENDING");
            } else if (isDeliveryCategory(category) || "SHIPPER".equals(targetType)) {
                issue.setStatus("NEED_ADMIN_ACTION");
            } else {
                issue.setStatus("NEED_ADMIN_ACTION");
            }
        }

        Issue saved = issueRepository.saveAndFlush(issue);
        saved.setCode(buildIssueCode(saved.getId()));
        saved = issueRepository.save(saved);

        issueEventRepository.save(event(saved.getId(), account, "NOTE", "CREATE ISSUE", null, null, null, null));
        if (req.getDescription() != null && !req.getDescription().trim().isEmpty()) {
            issueEventRepository.save(event(saved.getId(), account, "MESSAGE", req.getDescription(), null, null, null, null));
        }

        return saved;
    }

    @Transactional
    public Issue createIssueWithAttachments(CreateIssueWithAttachmentsRequest req) {
        // Reuse logic createIssue hiện có bằng cách map lại:
        IssueCreateRequest createReq = new IssueCreateRequest();
        createReq.setAccountId(req.getAccountId());
        createReq.setOrderId(req.getOrderId());
        createReq.setTargetType(req.getTargetType());
        createReq.setTargetId(req.getTargetId());
        createReq.setTargetNote(req.getTargetNote());
        createReq.setCategory(req.getCategory());
        createReq.setOtherCategory(req.getOtherCategory());
        createReq.setTitle(req.getTitle());
        createReq.setDescription(req.getDescription());

        Issue created = createIssue(createReq); // createIssue đã ghi NOTE + MESSAGE event

        // add ATTACHMENT events ngay trong transaction này
        if (req.getAttachments() != null) {
            for (IssueAttachmentRequest a : req.getAttachments()) {
                if (a == null) continue;
                if (a.getAttachmentUrl() == null || a.getAttachmentUrl().trim().isEmpty()) continue;

                IssueAttachmentRequest x = new IssueAttachmentRequest();
                x.setAccountId(req.getAccountId()); // ép dùng accountId root
                x.setAttachmentUrl(a.getAttachmentUrl());
                x.setContent(a.getContent());

                // gọi addAttachment đã fix orderId null
                addAttachment(created.getId(), x);
            }
        }

        // Nếu bất kỳ bước nào fail (issue_events fail) => throw => rollback => issue không tạo
        return created;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getIssueDetail(Integer issueId, Integer accountId) {
        Account account = getAccount(accountId);
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        Order order = null;
        if (issue.getOrderId() != null) {
            order = orderRepository.findById(issue.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + issue.getOrderId()));
            ensureAccess(account, issue, order);
        } else {
            // không có order => chỉ ADMIN hoặc người tạo xem
            String role = normalizeRole(account.getRole());
            if (!"ADMIN".equals(role) && !account.getId().equals(issue.getCreatedById())) {
                throw new SecurityException("No access to this issue");
            }
        }

        List<IssueEvent> events = issueEventRepository.findByIssueIdOrderByCreatedAtAsc(issueId);

        Map<String, Object> orderSummary = null;
        if (order != null) {
            orderSummary = new HashMap<>();
            orderSummary.put("id", order.getId());
            orderSummary.put("orderNumber", order.getOrderNumber());
            orderSummary.put("status", order.getStatus());
            orderSummary.put("paymentMethod", order.getPaymentMethod());
            orderSummary.put("subtotal", order.getSubtotal());
            orderSummary.put("shippingFee", order.getShippingFee());
            orderSummary.put("totalAmount", order.getTotalAmount());
            orderSummary.put("createdAt", order.getCreatedAt());
            orderSummary.put("completedAt", order.getCompletedAt());
        }

        Map<String, Object> res = new HashMap<>();
        res.put("issue", issue);
        res.put("events", events);
        res.put("orderSummary", orderSummary);
        return res;
    }

    @Transactional(readOnly = true)
    public List<Issue> list(Integer actorId, String scope) {
        Account actor = getAccount(actorId);
        String role = normalizeRole(actor.getRole());
        String s = (scope == null ? "MY" : scope.trim().toUpperCase(Locale.ROOT));

        return switch (s) {
            case "ASSIGNED" -> {
                if ("OWNER".equals(role)) yield issueRepository.findByAssignedOwnerIdOrderByCreatedAtDesc(actorId);
                if ("ADMIN".equals(role)) yield issueRepository.findByAssignedAdminIdOrderByCreatedAtDesc(actorId);
                yield List.of();
            }
            case "ALL" -> {
                if (!"ADMIN".equals(role)) throw new SecurityException("ADMIN only");
                yield issueRepository.findAll().stream()
                        .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                        .toList();
            }
            default -> issueRepository.findByCreatedByIdOrderByCreatedAtDesc(actorId);
        };
    }

    @Transactional
    public void addMessage(Integer issueId, IssueMessageRequest req) {
        if (req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("content is required");
        }

        Account account = getAccount(req.getAccountId());
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        if (issue.getOrderId() != null) {
            Order order = orderRepository.findById(issue.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + issue.getOrderId()));
            ensureAccess(account, issue, order);
        } else {
            // SYSTEM/OTHER không có order
            ensureAccessNoOrder(account, issue);
        }

        issueEventRepository.save(event(issueId, account, "MESSAGE", req.getContent(), null, null, null, null));
    }

    @Transactional
    public void addAttachment(Integer issueId, IssueAttachmentRequest req) {
        if (req.getAttachmentUrl() == null || req.getAttachmentUrl().trim().isEmpty()) {
            throw new IllegalArgumentException("attachmentUrl is required");
        }

        Account actor = getAccount(req.getAccountId());
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        if (issue.getOrderId() != null) {
            Order order = orderRepository.findById(issue.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + issue.getOrderId()));
            ensureAccess(actor, issue, order);
        } else {
            // SYSTEM/OTHER không có order
            ensureAccessNoOrder(actor, issue);
        }

        issueEventRepository.save(
                event(issueId, actor, "ATTACHMENT",
                        req.getContent(),
                        null, null,
                        null,
                        req.getAttachmentUrl())
        );
    }

    @Transactional
    public Issue changeStatus(Integer issueId, IssueStatusChangeRequest req) {
        if (req.getStatus() == null || req.getStatus().trim().isEmpty()) {
            throw new IllegalArgumentException("status is required");
        }

        Account account = getAccount(req.getAccountId());
        String role = normalizeRole(account.getRole());

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        if (issue.getOrderId() != null) {
            Order order = orderRepository.findById(issue.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + issue.getOrderId()));
            ensureAccess(account, issue, order);
        } else {
            ensureAccessNoOrder(account, issue);
        }

        if (!"OWNER".equals(role) && !"ADMIN".equals(role)) {
            throw new SecurityException("Only OWNER/ADMIN can change status");
        }

        String newStatus = req.getStatus().trim().toUpperCase(Locale.ROOT);
        String oldStatus = issue.getStatus();
        issue.setStatus(newStatus);

        if ("RESOLVED".equals(newStatus) || "CLOSED".equals(newStatus)) {
            issue.setResolvedAt(LocalDateTime.now());
            issue.setResolvedReason(req.getReason());
        }

        Issue saved = issueRepository.save(issue);
        issueEventRepository.save(event(issueId, account, "STATUS_CHANGE", req.getReason(), oldStatus, newStatus, null, null));
        return saved;
    }

    @Transactional
    public Issue ownerRefund(Integer issueId, IssueDecisionRequest req) {
        Account account = getAccount(req.getAccountId());
        String role = normalizeRole(account.getRole());
        if (!"OWNER".equals(role)) throw new SecurityException("Only OWNER can approve/refuse owner refund");

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
        Order order = orderRepository.findById(issue.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + issue.getOrderId()));

        Integer ownerId = ownerAccountId(order.getRestaurant());
        if (ownerId == null || !account.getId().equals(ownerId)) {
            throw new SecurityException("Not your restaurant order");
        }

        String decision = (req.getDecision() == null ? "" : req.getDecision().trim().toUpperCase(Locale.ROOT));
        if (!Set.of("APPROVED", "REJECTED").contains(decision)) {
            throw new IllegalArgumentException("decision must be APPROVED or REJECTED");
        }

        BigDecimal amount = null;
        if ("APPROVED".equals(decision)) {
            if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("amount is required when APPROVED");
            }
            amount = req.getAmount();
            issue.setOwnerRefundAmount(amount);
        } else {
            issue.setOwnerRefundAmount(null);
        }

        String old = issue.getOwnerRefundStatus();
        issue.setOwnerRefundStatus(decision);
        Issue saved = issueRepository.save(issue);

        issueEventRepository.save(event(issueId, account, "OWNER_REFUND", req.getNote(), old, decision, amount, null));
        return saved;
    }

    @Transactional
    public Issue adminCredit(Integer issueId, IssueDecisionRequest req) {
        Account account = getAccount(req.getAccountId());
        String role = normalizeRole(account.getRole());
        if (!"ADMIN".equals(role)) throw new SecurityException("Only ADMIN can approve/refuse admin credit");

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        String decision = (req.getDecision() == null ? "" : req.getDecision().trim().toUpperCase(Locale.ROOT));
        if (!Set.of("APPROVED", "REJECTED").contains(decision)) {
            throw new IllegalArgumentException("decision must be APPROVED or REJECTED");
        }

        BigDecimal amount = null;
        if ("APPROVED".equals(decision)) {
            if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("amount must be >= 0 when APPROVED");
            }
            amount = req.getAmount();
            issue.setAdminCreditAmount(amount);
        }

        if ("APPROVED".equals(decision)) {
            issue.setStatus("RESOLVED");
        } else {
            issue.setStatus("REJECTED");
        }
        issue.setResolvedAt(LocalDateTime.now());
        issue.setResolvedReason(req.getNote());

        String old = issue.getAdminCreditStatus();
        issue.setAdminCreditStatus(decision);
        Issue saved = issueRepository.save(issue);

        issueEventRepository.save(event(issueId, account, "ADMIN_CREDIT", req.getNote(), old, decision, amount, null));
        return saved;
    }

    @Transactional
    public Issue replyAction(Integer issueId, IssueReplyActionRequest req) {
        if (req == null) throw new IllegalArgumentException("request body is required");

        Account account = getAccount(req.getAccountId());
        String role = normalizeRole(account.getRole());

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        // Load order nếu có (SYSTEM/OTHER có thể null)
        Order order = null;
        if (issue.getOrderId() != null) {
            order = orderRepository.findById(issue.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + issue.getOrderId()));
            ensureAccess(account, issue, order);
        } else {
            ensureAccessNoOrder(account, issue);
        }

        boolean hasMessage = req.getMessage() != null && !req.getMessage().trim().isEmpty();
        boolean hasStatus = req.getNewStatus() != null && !req.getNewStatus().trim().isEmpty();
        boolean hasOwnerRefund = req.getOwnerRefundStatus() != null && !req.getOwnerRefundStatus().trim().isEmpty();
        boolean hasAdminCredit = req.getAdminCreditStatus() != null && !req.getAdminCreditStatus().trim().isEmpty();

        if (!hasMessage && !hasStatus && !hasOwnerRefund && !hasAdminCredit) {
            throw new IllegalArgumentException("Nothing to update");
        }

        // Tránh mâu thuẫn: adminCredit tự set status rồi, không cho gửi kèm newStatus
        if (hasAdminCredit && hasStatus) {
            throw new IllegalArgumentException("newStatus is not allowed when adminCreditStatus is provided");
        }

        List<IssueEvent> events = new ArrayList<>();

        // 1) MESSAGE (chưa save gì vào DB cho tới khi validate xong)
        if (hasMessage) {
            String content = req.getMessage().trim();
            events.add(event(issueId, account, "MESSAGE", content, null, null, null, null));
        }

        // 2) STATUS_CHANGE (optional)
        if (hasStatus) {
            if (!"OWNER".equals(role) && !"ADMIN".equals(role)) {
                throw new SecurityException("Only OWNER/ADMIN can change status");
            }

            String newStatus = req.getNewStatus().trim().toUpperCase(Locale.ROOT);
            String oldStatus = issue.getStatus();

            issue.setStatus(newStatus);

            if ("RESOLVED".equals(newStatus) || "CLOSED".equals(newStatus)) {
                issue.setResolvedAt(LocalDateTime.now());
                issue.setResolvedReason(req.getStatusReason());
            }

            events.add(event(issueId, account, "STATUS_CHANGE",
                    req.getStatusReason(), oldStatus, newStatus, null, null));
        }

        // 3) OWNER_REFUND (optional)
        if (hasOwnerRefund) {
            if (!"OWNER".equals(role)) throw new SecurityException("Only OWNER can approve/refuse owner refund");
            if (order == null) throw new IllegalArgumentException("Order is required for owner refund");

            Integer ownerId = ownerAccountId(order.getRestaurant());
            if (ownerId == null || !account.getId().equals(ownerId)) {
                throw new SecurityException("Not your restaurant order");
            }

            String decision = req.getOwnerRefundStatus().trim().toUpperCase(Locale.ROOT);
            if (!Set.of("APPROVED", "REJECTED").contains(decision)) {
                throw new IllegalArgumentException("ownerRefundStatus must be APPROVED or REJECTED");
            }

            BigDecimal amount = null;
            if ("APPROVED".equals(decision)) {
                if (req.getOwnerRefundAmount() == null || req.getOwnerRefundAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("ownerRefundAmount is required when APPROVED");
                }
                amount = req.getOwnerRefundAmount();
                issue.setOwnerRefundAmount(amount);
            } else {
                issue.setOwnerRefundAmount(null);
            }

            String old = issue.getOwnerRefundStatus();
            issue.setOwnerRefundStatus(decision);

            events.add(event(issueId, account, "OWNER_REFUND", null, old, decision, amount, null));
        }

        // 4) ADMIN_CREDIT (optional)
        if (hasAdminCredit) {
            if (!"ADMIN".equals(role)) throw new SecurityException("Only ADMIN can approve/refuse admin credit");

            String decision = req.getAdminCreditStatus().trim().toUpperCase(Locale.ROOT);
            if (!Set.of("APPROVED", "REJECTED").contains(decision)) {
                throw new IllegalArgumentException("adminCreditStatus must be APPROVED or REJECTED");
            }

            BigDecimal amount = null;
            if ("APPROVED".equals(decision)) {
                if (req.getAdminCreditAmount() == null || req.getAdminCreditAmount().compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalArgumentException("adminCreditAmount must be >= 0 when APPROVED");
                }
                amount = req.getAdminCreditAmount();
                issue.setAdminCreditAmount(amount);

                issue.setStatus("RESOLVED");
            } else {
                // REJECTED
                issue.setStatus("REJECTED");
            }

            issue.setResolvedAt(LocalDateTime.now());
            // nếu muốn ghi reason thì dùng statusReason (dto hiện chưa có field note riêng cho adminCredit)
            issue.setResolvedReason(req.getStatusReason());

            String old = issue.getAdminCreditStatus();
            issue.setAdminCreditStatus(decision);

            events.add(event(issueId, account, "ADMIN_CREDIT", null, old, decision, amount, null));
        }

        // WRITE DB ở cuối: nếu bất kỳ lỗi nào ở trên xảy ra → throw RuntimeException → rollback hết
        Issue saved = issueRepository.save(issue);
        issueEventRepository.saveAll(events);

        return saved;
    }

}
