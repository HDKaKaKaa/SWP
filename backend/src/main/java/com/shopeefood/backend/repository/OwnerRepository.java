package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Owner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface OwnerRepository extends JpaRepository<Owner, Integer> {
    Optional<Owner> findByAccount_Id(Integer accountId);
}