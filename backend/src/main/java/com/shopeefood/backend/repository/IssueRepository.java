package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Issue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IssueRepository extends JpaRepository<Issue, Integer> {
    Optional<Issue> findByCode(String code);

    List<Issue> findByCreatedByIdOrderByCreatedAtDesc(Integer createdById);

    List<Issue> findByAssignedOwnerIdOrderByCreatedAtDesc(Integer assignedOwnerId);

    List<Issue> findByAssignedAdminIdOrderByCreatedAtDesc(Integer assignedAdminId);
}