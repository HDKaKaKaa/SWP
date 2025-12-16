package com.shopeefood.backend.dto;

import lombok.Data;

@Data
public class IssueMessageRequest {
    private Integer accountId;
    private String content;
}
