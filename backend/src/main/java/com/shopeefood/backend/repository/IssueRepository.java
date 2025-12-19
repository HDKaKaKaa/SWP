package com.shopeefood.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.shopeefood.backend.entity.Issue;

@Repository
public interface IssueRepository extends JpaRepository<Issue, Integer>, JpaSpecificationExecutor<Issue> {
    
    // Thêm các phương thức để sửa lỗi "undefined" trong IssueService
    List<Issue> findByAssignedOwnerIdOrderByCreatedAtDesc(Integer ownerId);
    
    List<Issue> findByAssignedAdminIdOrderByCreatedAtDesc(Integer adminId);
    
    List<Issue> findByCreatedByIdOrderByCreatedAtDesc(Integer createdById);
}