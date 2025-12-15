package com.shopeefood.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class IssueDecisionRequest {
    private Integer accountId;
    private String decision; // APPROVED / REJECTED
    private BigDecimal amount; // required when APPROVED
    private String note; // optional
}
