package com.shopeefood.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateIssueWithAttachmentsRequest {
    private Integer accountId;
    private Integer orderId;
    private String targetType;
    private Integer targetId;
    private String targetNote;
    private String category;
    private String otherCategory;
    private String title;
    private String description;

    private List<IssueAttachmentRequest> attachments; // reuse DTO cũ
}
