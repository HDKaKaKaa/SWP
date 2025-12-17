package com.shopeefood.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class IssueReplyActionRequest {
    private Integer accountId;

    // reply content
    private String message;

    // optional: status change
    private String newStatus;        // e.g. RESOLVED / WAITING_OWNER ...
    private String statusReason;     // optional

    // optional: refund/credit decision (tùy hệ bạn đang dùng)
    private String ownerRefundStatus;
    private BigDecimal ownerRefundAmount;
    private String adminCreditStatus;
    private BigDecimal adminCreditAmount;
}

