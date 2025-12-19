package com.shopeefood.backend.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class IssueEventRequest {
    private Integer accountId;
    private String eventType; // MESSAGE / OWNER_REFUND
    private String content;
    private BigDecimal amount;
    private String attachmentUrl; // Trường này giúp sửa lỗi getAttachmentUrl()
}