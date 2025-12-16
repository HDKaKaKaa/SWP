package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class IssueStatusChangeRequest {
    private Integer accountId;
    private String status; // OPEN/NEED_*/RESOLVED/CLOSED
    private String reason; // optional
}
