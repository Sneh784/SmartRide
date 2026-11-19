package com.smartride.backend.repository;

import com.smartride.backend.entity.VendorApplication;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VendorApplicationRepository extends JpaRepository<VendorApplication, Long> {
    Optional<VendorApplication> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT application FROM VendorApplication application WHERE application.id = :id")
    Optional<VendorApplication> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT application FROM VendorApplication application
            JOIN application.user user
            WHERE (:status = '' OR application.status = :status)
              AND (:search = '' OR LOWER(user.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(user.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(application.applicationNumber) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:fromDate IS NULL OR application.submittedAt >= :fromDate)
              AND (:toDate IS NULL OR application.submittedAt < :toDate)
            """)
    Page<VendorApplication> search(@Param("status") String status,
                                   @Param("search") String search,
                                   @Param("fromDate") java.time.LocalDateTime fromDate,
                                   @Param("toDate") java.time.LocalDateTime toDate,
                                   Pageable pageable);
}
