package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.IssueEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IssueEventRepository extends JpaRepository<IssueEvent, Integer> {
    List<IssueEvent> findByIssueIdOrderByCreatedAtAsc(Integer issueId);
}
