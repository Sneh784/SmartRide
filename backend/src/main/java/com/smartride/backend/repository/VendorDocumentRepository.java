package com.smartride.backend.repository;

import com.smartride.backend.entity.VendorDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendorDocumentRepository extends JpaRepository<VendorDocument, Long> {
    List<VendorDocument> findByApplicationIdOrderById(Long applicationId);
    Optional<VendorDocument> findByIdAndApplicationUserId(Long id, Long userId);
}
