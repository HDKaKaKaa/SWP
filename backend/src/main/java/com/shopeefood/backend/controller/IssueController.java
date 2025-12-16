package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.*;
import com.shopeefood.backend.entity.Issue;
import com.shopeefood.backend.service.IssueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    @PostMapping
    public ResponseEntity<Issue> create(@RequestBody IssueCreateRequest req) {
        return ResponseEntity.ok(issueService.createIssue(req));
    }

    /**
     * GET /api/issues/{id}?actorId=1
     * returns: { issue: ..., events: [...] }
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Integer id, @RequestParam Integer actorId) {
        return ResponseEntity.ok(issueService.getIssueDetail(id, actorId));
    }

    /**
     * scope:
     * - MY (default): issues created by actor
     * - ASSIGNED: assignedOwnerId (OWNER) or assignedAdminId (ADMIN)
     * - ALL: admin only
     */
    @GetMapping
    public ResponseEntity<List<Issue>> list(@RequestParam Integer actorId,
                                            @RequestParam(required = false, defaultValue = "MY") String scope) {
        return ResponseEntity.ok(issueService.list(actorId, scope));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> addMessage(@PathVariable Integer id, @RequestBody IssueMessageRequest req) {
        issueService.addMessage(id, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<?> addAttachment(@PathVariable Integer id, @RequestBody IssueAttachmentRequest req) {
        issueService.addAttachment(id, req);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Issue> changeStatus(@PathVariable Integer id, @RequestBody IssueStatusChangeRequest req) {
        return ResponseEntity.ok(issueService.changeStatus(id, req));
    }

    /** Owner approves/refuses refund for order items/subtotal */
    @PostMapping("/{id}/owner-refund")
    public ResponseEntity<Issue> ownerRefund(@PathVariable Integer id, @RequestBody IssueDecisionRequest req) {
        return ResponseEntity.ok(issueService.ownerRefund(id, req));
    }

    /** Admin approves/refuses credit/refund for delivery fee / platform compensation */
    @PostMapping("/{id}/admin-credit")
    public ResponseEntity<Issue> adminCredit(@PathVariable Integer id, @RequestBody IssueDecisionRequest req) {
        return ResponseEntity.ok(issueService.adminCredit(id, req));
    }
}

