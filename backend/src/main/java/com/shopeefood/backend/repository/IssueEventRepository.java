package com.shopeefood.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.shopeefood.backend.entity.IssueEvent;

@Repository
public interface IssueEventRepository extends JpaRepository<IssueEvent, Integer> {
    // Phải là public để Service có thể truy cập (Sửa lỗi "is not visible")
    List<IssueEvent> findByIssueIdOrderByCreatedAtAsc(Integer issueId);
}