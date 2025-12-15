package com.shopeefood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Bảng này được sử dụng như một luồng (stream) thống nhất để lưu:
 * - tin nhắn trao đổi
 * - tệp đính kèm
 * - thay đổi trạng thái
 * - các quyết định xử lý (hoàn tiền của Owner / bù tiền của Admin)
 */
@Data
@Entity
@Table(name = "issue_events")
public class IssueEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "issue_id", nullable = false)
    private Integer issueId;

    @Column(name = "account_id", nullable = false)
    private Integer accountId;

    @Column(name = "account_role", nullable = false)
    private String accountRole; // CUSTOMER/SHIPPER/OWNER/ADMIN

    @Column(name = "event_type", nullable = false)
    private String eventType; // MESSAGE/ATTACHMENT/STATUS_CHANGE/ASSIGN/OWNER_REFUND/ADMIN_CREDIT/NOTE

    @Column
    private String content;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    @Column
    private BigDecimal amount;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}