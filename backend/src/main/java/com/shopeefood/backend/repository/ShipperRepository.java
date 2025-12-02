package com.shopeefood.backend.repository;

import com.shopeefood.backend.entity.Shipper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ShipperRepository extends JpaRepository<Shipper, Integer> {

    /**
     * Đếm số Shipper đang bật ứng dụng (ONLINE).
     */
    @Query("SELECT COUNT(s) FROM Shipper s WHERE s.status = 'ONLINE'")
    Long countOnlineShippers();
}