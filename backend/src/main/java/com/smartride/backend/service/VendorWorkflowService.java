package com.smartride.backend.service;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.dto.LoginResponse;
import com.smartride.backend.dto.VendorRegistrationRequest;
import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.entity.VendorApplication;
import com.smartride.backend.entity.VendorDocument;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.repository.VendorApplicationRepository;
import com.smartride.backend.repository.VendorDocumentRepository;
import com.smartride.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class VendorWorkflowService {
    private static final Pattern PHONE_DIGITS = Pattern.compile("\\D");
    private static final Set<String> ADDITIONAL_DOCUMENT_TYPES =
            Set.of("IDENTITY_PROOF", "PAN_CARD", "ADDRESS_PROOF", "BUSINESS_REGISTRATION");
    private final VendorApplicationRepository applications;
    private final VendorDocumentRepository documents;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JdbcTemplate jdbc;
    private final CloudinaryImageStorage cloudinary;
    private final ApprovalEmailNotificationService approvalEmails;

    public VendorWorkflowService(VendorApplicationRepository applications, VendorDocumentRepository documents,
                                 UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
                                 JwtService jwtService, JdbcTemplate jdbc, CloudinaryImageStorage cloudinary,
                                 ApprovalEmailNotificationService approvalEmails) {
        this.applications = applications;
        this.documents = documents;
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jdbc = jdbc;
        this.cloudinary = cloudinary;
        this.approvalEmails = approvalEmails;
    }

    @Transactional
    public Map<String, Object> register(VendorRegistrationRequest request, MultipartFile profileImage,
                                        MultipartFile identityProof, MultipartFile panCard,
                                        MultipartFile businessDocument, MultipartFile addressProof) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String phone = normalizePhone(request.getMobileNumber());
        if (!request.isTermsAccepted() || !request.isVendorPoliciesAccepted()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Accept the Terms and Vendor Policies to continue");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        if (users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        if (phoneAlreadyRegistered(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this mobile number already exists");
        }
        if (identityProof == null || panCard == null || addressProof == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identity proof, PAN card, and address proof are required");
        }

        Role vendorRole = roles.findByName(RoleName.VENDOR)
                .orElseThrow(() -> new IllegalStateException("VENDOR role is not configured"));
        User user = new User();
        user.setFullName(request.getFullName().trim());
        String[] nameParts = splitName(user.getFullName());
        user.setFirstName(nameParts[0]);
        user.setLastName(nameParts[1]);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(RoleName.VENDOR);
        user.setRoles(Set.of(vendorRole));
        user.setActive(false);
        user.setApprovalStatus("PENDING");
        User savedUser = users.saveAndFlush(user);

        VendorApplication application = new VendorApplication();
        application.setApplicationNumber("SRV-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT));
        application.setUser(savedUser);
        application.setBusinessName(request.getBusinessName().trim());
        application.setBusinessType(request.getBusinessType().trim());
        application.setBusinessEmail(request.getBusinessEmail().trim().toLowerCase(Locale.ROOT));
        application.setBusinessMobile(normalizePhone(request.getBusinessMobile()));
        application.setBusinessAddress(request.getBusinessAddress().trim());
        application.setCity(request.getCity().trim());
        application.setState(request.getState().trim());
        application.setPincode(request.getPincode().trim());
        application.setRegistrationNumber(blankToNull(request.getRegistrationNumber()));
        application.setStatus("PENDING");
        application.setSubmittedAt(LocalDateTime.now());
        VendorApplication savedApplication = applications.saveAndFlush(application);

        List<CloudinaryImageStorage.StoredAsset> storedKeys = new ArrayList<>();
        try {
            saveDocument(savedApplication, "IDENTITY_PROOF", identityProof, false, storedKeys);
            saveDocument(savedApplication, "PAN_CARD", panCard, false, storedKeys);
            saveDocument(savedApplication, "ADDRESS_PROOF", addressProof, false, storedKeys);
            saveDocument(savedApplication, "BUSINESS_REGISTRATION", businessDocument, false, storedKeys);
            saveDocument(savedApplication, "PROFILE_IMAGE", profileImage, true, storedKeys);
            addVendorNotification(savedUser.getId(), "Application submitted",
                    "Your SmartRide vendor application has been submitted and is pending admin review.");
            jdbc.update("""
                    INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                    VALUES (?, ?, 'VENDOR_APPLICATION', 'VENDOR_APPLICATION', ?)
                    """, "New vendor application", user.getFullName() + " submitted a vendor application",
                    savedApplication.getId());
        } catch (RuntimeException exception) {
            storedKeys.stream().filter(java.util.Objects::nonNull)
                    .forEach(asset -> cloudinary.delete(asset.publicId(), asset.resourceType()));
            throw exception;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", savedApplication.getApplicationNumber());
        result.put("vendorName", savedUser.getFullName());
        result.put("email", savedUser.getEmail());
        result.put("submittedAt", savedApplication.getSubmittedAt());
        result.put("status", savedApplication.getStatus());
        return result;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (user.getRole() != RoleName.VENDOR || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        String status = user.getApprovalStatus() == null ? "" : user.getApprovalStatus().toUpperCase(Locale.ROOT);
        if ("PENDING".equals(status)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Your Vendor Application is pending Admin approval. You will be able to log in after approval.");
        }
        if ("REJECTED".equals(status)) {
            String reason = blankToNull(user.getApprovalReason());
            String message = "Your Vendor Application has been rejected. Please check your registered email for details.";
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    reason == null ? message : message + " Reason: " + reason);
        }
        if ("SUSPENDED".equals(status) || !user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Your Vendor account is currently suspended. Please contact SmartRide Support.");
        }
        if (!"APPROVED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vendor account is not approved");
        }
        return new LoginResponse(jwtService.generateToken(user.getEmail()), "Bearer",
                user.getFullName(), RoleName.VENDOR.name(), user.getEmail());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> ownApplication(String email) {
        User user = requireVendor(email);
        VendorApplication application = applications.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor application not found"));
        return applicationDetails(application, false);
    }

    @Transactional
    public Map<String, Object> uploadDocument(String email, String documentType, MultipartFile file) {
        String normalizedType = documentType == null ? "" : documentType.trim().toUpperCase(Locale.ROOT);
        if (!ADDITIONAL_DOCUMENT_TYPES.contains(normalizedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported vendor document type");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a document to upload");
        }

        User user = requireVendor(email);
        VendorApplication application = applications.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor application not found"));
        CloudinaryImageStorage.StoredAsset stored = cloudinary.store(file, "smartride/vendors/documents", false);

        VendorDocument document = new VendorDocument();
        document.setApplication(application);
        document.setDocumentType(normalizedType);
        document.setStorageKey(stored.publicId());
        document.setCloudinaryPublicId(stored.publicId());
        document.setSecureUrl(stored.secureUrl());
        document.setOriginalName(stored.originalName());
        document.setContentType(stored.contentType());
        document.setUploadedAt(LocalDateTime.now());
        try {
            documents.save(document);
        } catch (RuntimeException exception) {
            cloudinary.delete(stored.publicId(), stored.resourceType());
            throw exception;
        }

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) cloudinary.delete(stored.publicId(), stored.resourceType());
                }
            });
        }
        return documentDetails(document, false);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminApplications(String status, String search, LocalDate from, LocalDate to,
                                                  int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination values");
        }
        if (from != null && to != null && to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must not be before start date");
        }
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!normalized.isEmpty() && !Set.of("PENDING", "APPROVED", "REJECTED", "SUSPENDED").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid vendor application status");
        }
        LocalDateTime fromTime = from == null ? null : from.atStartOfDay();
        LocalDateTime toTime = to == null ? null : to.plusDays(1).atStartOfDay();
        String normalizedSearch = search == null ? "" : search.trim();

        StringBuilder countSql = new StringBuilder("""
                SELECT COUNT(*)
                FROM vendor_applications application
                JOIN users vendor ON vendor.id = application.user_id
                WHERE 1 = 1
                """);
        StringBuilder itemsSql = new StringBuilder("""
                SELECT application.id, vendor.id AS user_id, application.application_number, vendor.full_name,
                       vendor.email, vendor.phone, application.business_name, application.city,
                       application.submitted_at, application.status
                FROM vendor_applications application
                JOIN users vendor ON vendor.id = application.user_id
                WHERE 1 = 1
                """);
        List<Object> countArgs = new ArrayList<>();
        List<Object> itemsArgs = new ArrayList<>();

        if (!normalized.isEmpty()) {
            countSql.append(" AND application.status = ?");
            itemsSql.append(" AND application.status = ?");
            countArgs.add(normalized);
            itemsArgs.add(normalized);
        }
        if (!normalizedSearch.isEmpty()) {
            String searchPattern = "%" + normalizedSearch.toLowerCase(Locale.ROOT) + "%";
            countSql.append("""
                     AND (LOWER(vendor.full_name) LIKE ?
                          OR LOWER(vendor.email) LIKE ?
                          OR LOWER(application.application_number) LIKE ?)
                    """);
            itemsSql.append("""
                     AND (LOWER(vendor.full_name) LIKE ?
                          OR LOWER(vendor.email) LIKE ?
                          OR LOWER(application.application_number) LIKE ?)
                    """);
            countArgs.add(searchPattern);
            countArgs.add(searchPattern);
            countArgs.add(searchPattern);
            itemsArgs.add(searchPattern);
            itemsArgs.add(searchPattern);
            itemsArgs.add(searchPattern);
        }
        if (fromTime != null) {
            countSql.append(" AND application.submitted_at >= ?");
            itemsSql.append(" AND application.submitted_at >= ?");
            countArgs.add(fromTime);
            itemsArgs.add(fromTime);
        }
        if (toTime != null) {
            countSql.append(" AND application.submitted_at < ?");
            itemsSql.append(" AND application.submitted_at < ?");
            countArgs.add(toTime);
            itemsArgs.add(toTime);
        }

        itemsSql.append(" ORDER BY application.submitted_at DESC, application.id DESC LIMIT ? OFFSET ?");
        itemsArgs.add(size);
        itemsArgs.add((long) page * size);

        Long totalElements = jdbc.queryForObject(countSql.toString(), Long.class,
                countArgs.toArray());
        List<Map<String, Object>> items = jdbc.queryForList(itemsSql.toString(),
                itemsArgs.toArray()).stream().map(row -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", row.get("id"));
                    item.put("applicationNumber", row.get("application_number"));
                    item.put("fullName", row.get("full_name"));
                    item.put("email", row.get("email"));
                    item.put("mobileNumber", row.get("phone"));
                    item.put("businessName", row.get("business_name"));
                    item.put("city", row.get("city"));
                    item.put("submittedAt", row.get("submitted_at"));
                    item.put("status", row.get("status"));
                    item.putAll(approvalEmails.status(((Number) row.get("user_id")).longValue(), "VENDOR"));
                    return item;
                }).toList();
        long total = totalElements == null ? 0 : totalElements;
        int totalPages = (int) ((total + size - 1) / size);
        return Map.of("items", items, "page", page, "size", size,
                "totalElements", total, "totalPages", totalPages);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminApplication(long id) {
        VendorApplication application = applications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor application not found"));
        return applicationDetails(application, true);
    }

    @Transactional
    public void review(String adminEmail, long id, String action, String reason) {
        VendorApplication application = applications.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor application not found"));
        User admin = users.findByEmail(adminEmail.toLowerCase(Locale.ROOT))
                .filter(user -> user.getRole() == RoleName.ADMIN && user.isActive())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        String nextStatus = action.toUpperCase(Locale.ROOT);
        if ("APPROVED".equals(nextStatus) || "REJECTED".equals(nextStatus)) {
            if (!"PENDING".equals(application.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending applications can be approved or rejected");
            }
        } else if ("SUSPENDED".equals(nextStatus)) {
            if (!"APPROVED".equals(application.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Only approved vendors can be suspended");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported vendor status transition");
        }
        String cleanedReason = blankToNull(reason);
        if ("REJECTED".equals(nextStatus) && cleanedReason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        }

        User vendor = application.getUser();
        application.setStatus(nextStatus);
        application.setReviewedAt(LocalDateTime.now());
        application.setReviewedBy(admin);
        application.setRejectionReason("REJECTED".equals(nextStatus) ? cleanedReason : null);
        vendor.setApprovalStatus(nextStatus);
        vendor.setApprovalReason("REJECTED".equals(nextStatus) ? cleanedReason : null);
        vendor.setActive("APPROVED".equals(nextStatus));
        users.save(vendor);
        applications.save(application);

        jdbc.update("""
                INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, reason)
                VALUES (?, ?, 'VENDOR_APPLICATION', ?, ?)
                """, admin.getId(), nextStatus, application.getId(), cleanedReason);
        String message = switch (nextStatus) {
            case "APPROVED" -> "Your SmartRide vendor application has been approved. You can now log in.";
            case "REJECTED" -> "Your SmartRide vendor application has been rejected. Reason: " + cleanedReason;
            default -> "Your SmartRide vendor account has been suspended. Please contact SmartRide Support.";
        };
        addVendorNotification(vendor.getId(), "Application " + nextStatus.toLowerCase(Locale.ROOT), message);
        if ("APPROVED".equals(nextStatus)) approvalEmails.queue(vendor, "VENDOR");
    }

    public Map<String, Object> approvalEmailStatus(long applicationId) {
        VendorApplication application = applications.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor application not found"));
        return approvalEmails.status(application.getUser().getId(), "VENDOR");
    }

    @Transactional
    public Map<String, Object> retryApprovalEmail(long applicationId) {
        VendorApplication application = applications.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor application not found"));
        if (!"APPROVED".equals(application.getStatus()) || !application.getUser().isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only active, approved vendors can receive an approval email");
        }
        return approvalEmails.retry(application.getUser().getId(), "VENDOR");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> notifications(String email) {
        User user = requireVendor(email);
        List<Map<String, Object>> items = jdbc.queryForList("""
                SELECT id, title, message, is_read, created_at
                FROM vendor_notifications WHERE user_id = ?
                ORDER BY created_at DESC, id DESC LIMIT 100
                """, user.getId());
        Long unread = jdbc.queryForObject("SELECT COUNT(*) FROM vendor_notifications WHERE user_id = ? AND is_read = FALSE",
                Long.class, user.getId());
        return Map.of("items", items, "unread", unread == null ? 0 : unread);
    }

    @Transactional
    public void markNotificationRead(String email, long id) {
        User user = requireVendor(email);
        if (jdbc.update("UPDATE vendor_notifications SET is_read = TRUE WHERE id = ? AND user_id = ?", id, user.getId()) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    @Transactional(readOnly = true)
    public VendorDocument getDocument(Long userId, Long documentId, boolean admin) {
        VendorDocument document = documents.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!admin && !document.getApplication().getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        return document;
    }

    public long vendorUserId(String email) {
        return requireVendor(email).getId();
    }

    @Transactional
    public void deleteDocument(String email, long documentId) {
        VendorDocument document = getDocument(vendorUserId(email), documentId, false);
        if (document.getCloudinaryPublicId() == null || document.getCloudinaryPublicId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document has no Cloudinary publicId");
        }
        cloudinary.delete(document.getCloudinaryPublicId(), document.getContentType().startsWith("image/") ? "image" : "raw");
        documents.delete(document);
    }

    private void saveDocument(VendorApplication application, String type, MultipartFile file, boolean imageOnly,
                              List<CloudinaryImageStorage.StoredAsset> storedKeys) {
        if (file == null || file.isEmpty()) return;
        CloudinaryImageStorage.StoredAsset stored = cloudinary.store(file,
                imageOnly ? "smartride/vendors/profile" : "smartride/vendors/documents", imageOnly);
        storedKeys.add(stored);
        VendorDocument document = new VendorDocument();
        document.setApplication(application);
        document.setDocumentType(type);
        document.setStorageKey(stored.publicId());
        document.setCloudinaryPublicId(stored.publicId());
        document.setSecureUrl(stored.secureUrl());
        document.setOriginalName(stored.originalName());
        document.setContentType(stored.contentType());
        document.setUploadedAt(LocalDateTime.now());
        documents.save(document);
    }

    private Map<String, Object> applicationSummary(VendorApplication application) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", application.getId());
        result.put("applicationNumber", application.getApplicationNumber());
        result.put("fullName", application.getUser().getFullName());
        result.put("email", application.getUser().getEmail());
        result.put("mobileNumber", application.getUser().getPhone());
        result.put("businessName", application.getBusinessName());
        result.put("city", application.getCity());
        result.put("submittedAt", application.getSubmittedAt());
        result.put("status", application.getStatus());
        return result;
    }

    private Map<String, Object> applicationDetails(VendorApplication application, boolean admin) {
        Map<String, Object> result = applicationSummary(application);
        result.put("businessType", application.getBusinessType());
        result.put("businessEmail", application.getBusinessEmail());
        result.put("businessMobile", application.getBusinessMobile());
        result.put("businessAddress", application.getBusinessAddress());
        result.put("state", application.getState());
        result.put("pincode", application.getPincode());
        result.put("registrationNumber", application.getRegistrationNumber());
        result.put("rejectionReason", application.getRejectionReason());
        result.put("reviewedAt", application.getReviewedAt());
        result.put("reviewedBy", application.getReviewedBy() == null ? null : application.getReviewedBy().getFullName());
        result.put("documents", documents.findByApplicationIdOrderById(application.getId()).stream()
                .map(document -> documentDetails(document, admin)).toList());
        return result;
    }

    private Map<String, Object> documentDetails(VendorDocument document, boolean admin) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", document.getId());
        item.put("type", document.getDocumentType());
        item.put("originalName", document.getOriginalName());
        item.put("uploadedAt", document.getUploadedAt());
        item.put("downloadUrl", (admin ? "/api/admin/vendors/documents/" : "/api/vendor/documents/")
                + document.getId());
        item.put("secureUrl", document.getSecureUrl());
        item.put("publicId", document.getCloudinaryPublicId());
        return item;
    }

    private User requireVendor(String email) {
        User user = users.findByEmail(email.toLowerCase(Locale.ROOT))
                .filter(candidate -> candidate.getRole() == RoleName.VENDOR)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        return user;
    }

    private void addVendorNotification(long userId, String title, String message) {
        jdbc.update("INSERT INTO vendor_notifications (user_id, title, message) VALUES (?, ?, ?)",
                userId, title, message);
    }

    private static String normalizePhone(String phone) {
        String digits = PHONE_DIGITS.matcher(phone).replaceAll("");
        if (digits.startsWith("91") && digits.length() == 12) digits = digits.substring(2);
        if (digits.length() != 10) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid 10-digit mobile number");
        return digits;
    }

    private boolean phoneAlreadyRegistered(String normalizedPhone) {
        return jdbc.queryForList("SELECT phone FROM users WHERE phone IS NOT NULL", String.class).stream()
                .map(VendorWorkflowService::phoneDigits)
                .anyMatch(normalizedPhone::equals);
    }

    private static String phoneDigits(String phone) {
        String digits = PHONE_DIGITS.matcher(phone).replaceAll("");
        return digits.startsWith("91") && digits.length() == 12 ? digits.substring(2) : digits;
    }

    private static String[] splitName(String fullName) {
        int separator = fullName.indexOf(' ');
        return separator < 0 ? new String[]{fullName, "-"}
                : new String[]{fullName.substring(0, separator), fullName.substring(separator + 1).trim()};
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
