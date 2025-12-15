package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class IssueAttachmentRequest {
    private Integer accountId;
    private String attachmentUrl;
    private String content; // optional note
}