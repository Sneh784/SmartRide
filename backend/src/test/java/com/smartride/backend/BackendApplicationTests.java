package com.smartride.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.repository.VendorApplicationRepository;
import com.smartride.backend.security.JwtService;
import com.smartride.backend.service.DriverDocumentStorage;
import com.smartride.backend.service.CustomerKycDocumentStorage;
import com.smartride.backend.service.VendorDocumentStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "smartride.admin.initialization-enabled=false")
@AutoConfigureMockMvc
class BackendApplicationTests {
	@Autowired
	private VendorApplicationRepository vendorApplicationRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private RoleRepository roleRepository;

	@Autowired
	private JwtService jwtService;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@MockBean
	private VendorDocumentStorage vendorDocumentStorage;

	@MockBean
	private DriverDocumentStorage driverDocumentStorage;

	@MockBean
	private CustomerKycDocumentStorage customerKycDocumentStorage;

	@TempDir
	private Path tempDir;

	@Test
	void contextLoads() {
	}

	@Test
	void vendorApplicationsCanBeSearchedWithoutOptionalFilters() {
		var result = vendorApplicationRepository.search("", "", null, null,
				PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "submittedAt")));

		org.junit.jupiter.api.Assertions.assertNotNull(result);
	}

	@Test
	void validPublicVendorRegistrationCreatesPendingApplication() throws Exception {
		String suffix = UUID.randomUUID().toString();
		String email = "vendor-" + suffix + "@example.com";
		byte[] pdf = "%PDF-1.4\nvendor test document".getBytes(StandardCharsets.UTF_8);
		when(vendorDocumentStorage.store(any(), anyBoolean())).thenAnswer(invocation ->
				new VendorDocumentStorage.StoredFile(UUID.randomUUID() + ".pdf", ".pdf", "application/pdf"));

		var application = Map.ofEntries(
				Map.entry("fullName", "Integration Vendor"),
				Map.entry("email", email),
				Map.entry("mobileNumber", "9876543210"),
				Map.entry("password", "StrongPass1!"),
				Map.entry("confirmPassword", "StrongPass1!"),
				Map.entry("businessName", "Integration Rentals"),
				Map.entry("businessType", "Individual"),
				Map.entry("businessEmail", "business-" + suffix + "@example.com"),
				Map.entry("businessMobile", "+91 98765-43211"),
				Map.entry("businessAddress", "1 Test Street"),
				Map.entry("city", "Bengaluru"),
				Map.entry("state", "Karnataka"),
				Map.entry("pincode", "560001"),
				Map.entry("termsAccepted", true),
				Map.entry("vendorPoliciesAccepted", true));
		MockMultipartFile applicationPart = new MockMultipartFile(
				"application", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(application));

		mockMvc.perform(multipart("/api/vendor/auth/register")
						.file(applicationPart)
						.file(new MockMultipartFile("identityProof", "identity.pdf", "application/pdf", pdf))
						.file(new MockMultipartFile("panCard", "pan.pdf", "application/pdf", pdf))
						.file(new MockMultipartFile("addressProof", "address.pdf", "application/pdf", pdf)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.email").value(email));

		mockMvc.perform(multipart("/api/vendor/auth/register")
						.file(applicationPart)
						.file(new MockMultipartFile("identityProof", "identity.pdf", "application/pdf", pdf))
						.file(new MockMultipartFile("panCard", "pan.pdf", "application/pdf", pdf))
						.file(new MockMultipartFile("addressProof", "address.pdf", "application/pdf", pdf)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("An account with this email already exists"));
	}

	@Test
	void driverApplicationIsPendingUntilAdminApprovesIt() throws Exception {
		String suffix = UUID.randomUUID().toString();
		String email = "driver-" + suffix + "@example.com";
		String licenseNumber = "DL" + suffix.substring(0, 10).replace("-", "").toUpperCase();
		byte[] pdf = "%PDF-1.4\ndriver test document".getBytes(StandardCharsets.UTF_8);
		byte[] png = new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a};
		when(driverDocumentStorage.store(any())).thenAnswer(invocation -> {
			MockMultipartFile file = invocation.getArgument(0);
			return new DriverDocumentStorage.StoredFile(UUID.randomUUID() + ".pdf",
					file.getOriginalFilename(), "application/pdf");
		});
		when(driverDocumentStorage.storeImage(any())).thenAnswer(invocation -> {
			MockMultipartFile file = invocation.getArgument(0);
			return new DriverDocumentStorage.StoredFile(UUID.randomUUID() + ".png",
					file.getOriginalFilename(), "image/png");
		});
		Path storedPhoto = Files.write(tempDir.resolve("profile.png"), png);
		when(driverDocumentStorage.resolve(anyString())).thenReturn(storedPhoto);

		var application = Map.ofEntries(
				Map.entry("fullName", "Integration Driver"),
				Map.entry("email", email),
				Map.entry("mobileNumber", "9876543210"),
				Map.entry("password", "StrongPass1!"),
				Map.entry("confirmPassword", "StrongPass1!"),
				Map.entry("dateOfBirth", "1990-01-01"),
				Map.entry("address", "1 Driver Test Street"),
				Map.entry("city", "Bengaluru"),
				Map.entry("state", "Karnataka"),
				Map.entry("pincode", "560001"),
				Map.entry("licenseNumber", licenseNumber),
				Map.entry("licenseExpiryDate", java.time.LocalDate.now().plusYears(5).toString()),
				Map.entry("drivingExperienceYears", 10),
				Map.entry("vehicleCategories", java.util.List.of("Cars", "Passenger Vehicles")),
				Map.entry("termsAccepted", true),
				Map.entry("driverPoliciesAccepted", true));
		MockMultipartFile applicationPart = new MockMultipartFile(
				"application", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(application));

		mockMvc.perform(multipart("/api/driver/auth/register")
						.file(applicationPart)
						.file(new MockMultipartFile("drivingLicense", "license.pdf", "application/pdf", pdf))
						.file(new MockMultipartFile("identityProof", "identity.pdf", "application/pdf", pdf))
						.file(new MockMultipartFile("profilePhoto", "profile.png", "image/png", png)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.email").value(email));

		User driver = userRepository.findByEmail(email).orElseThrow();
		org.junit.jupiter.api.Assertions.assertEquals(RoleName.DRIVER, driver.getRole());
		org.junit.jupiter.api.Assertions.assertFalse(driver.isActive());
		org.junit.jupiter.api.Assertions.assertEquals("PENDING", driver.getApprovalStatus());

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsBytes(Map.of("email", email, "password", "StrongPass1!"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Your driver application is pending administrator approval"));

		String adminEmail = "driver-review-" + suffix + "@example.com";
		Role adminRole = roleRepository.findByName(RoleName.ADMIN).orElseThrow();
		User admin = new User();
		admin.setFirstName("Review");
		admin.setLastName("Admin");
		admin.setFullName("Review Admin");
		admin.setEmail(adminEmail);
		admin.setPassword("not-used-by-this-request");
		admin.setRole(RoleName.ADMIN);
		admin.setRoles(Set.of(adminRole));
		admin.setActive(true);
		userRepository.saveAndFlush(admin);
		String token = jwtService.generateToken(adminEmail);

		mockMvc.perform(get("/api/admin/drivers")
						.param("status", "PENDING")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].license_number").value(licenseNumber))
				.andExpect(jsonPath("$[0].vehicle_categories").value("Cars, Passenger Vehicles"))
				.andExpect(jsonPath("$[0].profile_photo_original_name").value("profile.png"));

		mockMvc.perform(get("/api/admin/drivers/" + driver.getId() + "/documents/PHOTO")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(content().bytes(png));

		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
						"/api/admin/users/DRIVER/" + driver.getId() + "/status")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"APPROVED\"}"))
				.andExpect(status().isNoContent());

		org.junit.jupiter.api.Assertions.assertTrue(userRepository.findByEmail(email).orElseThrow().isActive());
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsBytes(Map.of("email", email, "password", "StrongPass1!"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("DRIVER"));
	}

	@Test
	void customerCanRequestAvailableVehicleAndOverlappingRequestsAreRejected() throws Exception {
		String suffix = UUID.randomUUID().toString();
		String email = "customer-booking-" + suffix + "@example.com";
		Role customerRole = roleRepository.findByName(RoleName.CUSTOMER).orElseThrow();
		User customer = new User();
		customer.setFirstName("Booking");
		customer.setLastName("Customer");
		customer.setFullName("Booking Customer");
		customer.setEmail(email);
		customer.setPassword("not-used-by-this-request");
		customer.setRole(RoleName.CUSTOMER);
		customer.setRoles(Set.of(customerRole));
		customer.setActive(true);
		userRepository.saveAndFlush(customer);

		String vehicleTitle = "Customer booking test " + suffix;
		jdbcTemplate.update("""
				INSERT INTO vehicles (title, category, city, location, daily_rate, with_driver_rate,
				                      availability_status, approval_status)
				VALUES (?, 'Cars', 'Bengaluru', 'Test pickup', 2500, 3200, 'AVAILABLE', 'APPROVED')
				""", vehicleTitle);
		Long vehicleId = jdbcTemplate.queryForObject(
				"SELECT id FROM vehicles WHERE title = ?", Long.class, vehicleTitle);
		String token = jwtService.generateToken(email);
		java.time.LocalDateTime pickup = java.time.LocalDateTime.now().plusDays(2).withSecond(0).withNano(0);
		java.time.LocalDateTime returnDate = pickup.plusDays(3);
		Map<String, Object> request = Map.of(
				"vehicleId", vehicleId,
				"bookingType", "WITHOUT_DRIVER",
				"pickupDate", pickup.toString(),
				"returnDate", returnDate.toString(),
				"pickupLocation", "Test pickup",
				"returnLocation", "Test return");

		mockMvc.perform(post("/api/v1/bookings")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsBytes(request)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.paymentStatus").value("PENDING"))
				.andExpect(jsonPath("$.amount").value(7500));

		mockMvc.perform(post("/api/v1/bookings")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsBytes(request)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("This vehicle is already requested or reserved for those dates"));

		mockMvc.perform(get("/api/v1/customer/dashboard")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.customerName").value("Booking Customer"))
				.andExpect(jsonPath("$.totalBookings").value(1))
				.andExpect(jsonPath("$.upcomingBookings").value(1));

		Long bookingId = jdbcTemplate.queryForObject(
				"SELECT id FROM bookings WHERE customer_id = ? AND vehicle_id = ?",
				Long.class, customer.getId(), vehicleId);
		jdbcTemplate.update("UPDATE bookings SET status = 'COMPLETED' WHERE id = ?", bookingId);
		mockMvc.perform(post("/api/v1/customer/bookings/" + bookingId + "/review")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"rating\":5,\"comment\":\"Great trip\"}"))
				.andExpect(status().isNoContent());
		mockMvc.perform(post("/api/v1/customer/bookings/" + bookingId + "/review")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"rating\":5,\"comment\":\"Duplicate review\"}"))
				.andExpect(status().isConflict());
		mockMvc.perform(get("/api/v1/customer/booking-history")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].reviewed").value(true));
	}

	@Test
	void customerCanUploadPrivateKycDocumentForAdminReview() throws Exception {
		String suffix = UUID.randomUUID().toString();
		String email = "customer-kyc-" + suffix + "@example.com";
		Role customerRole = roleRepository.findByName(RoleName.CUSTOMER).orElseThrow();
		User customer = new User();
		customer.setFirstName("Kyc");
		customer.setLastName("Customer");
		customer.setFullName("Kyc Customer");
		customer.setEmail(email);
		customer.setPassword("not-used-by-this-request");
		customer.setRole(RoleName.CUSTOMER);
		customer.setRoles(Set.of(customerRole));
		customer.setActive(true);
		userRepository.saveAndFlush(customer);
		String customerToken = jwtService.generateToken(email);

		byte[] pdf = "%PDF-1.4\ncustomer kyc test".getBytes(StandardCharsets.UTF_8);
		when(customerKycDocumentStorage.store(any())).thenAnswer(invocation -> {
			MockMultipartFile document = invocation.getArgument(0);
			return new CustomerKycDocumentStorage.StoredFile(
					UUID.randomUUID() + ".pdf", document.getOriginalFilename(), "application/pdf");
		});
		Path storedDocument = Files.write(tempDir.resolve("customer-kyc.pdf"), pdf);
		when(customerKycDocumentStorage.resolve(anyString())).thenReturn(storedDocument);

		var application = Map.of("documentType", "DRIVING_LICENSE", "documentNumber", "DL1234567890");
		MockMultipartFile applicationPart = new MockMultipartFile(
				"application", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(application));
		mockMvc.perform(multipart("/api/v1/customer/kyc")
						.file(applicationPart)
						.file(new MockMultipartFile("document", "license.pdf", "application/pdf", pdf))
						.header("Authorization", "Bearer " + customerToken))
				.andExpect(status().isNoContent());
		mockMvc.perform(get("/api/v1/customer/kyc")
						.header("Authorization", "Bearer " + customerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].documentoriginalname").value("license.pdf"))
				.andExpect(jsonPath("$[0].documentlastfour").value("7890"));

		String adminEmail = "kyc-review-" + suffix + "@example.com";
		Role adminRole = roleRepository.findByName(RoleName.ADMIN).orElseThrow();
		User admin = new User();
		admin.setFirstName("Kyc");
		admin.setLastName("Admin");
		admin.setFullName("Kyc Admin");
		admin.setEmail(adminEmail);
		admin.setPassword("not-used-by-this-request");
		admin.setRole(RoleName.ADMIN);
		admin.setRoles(Set.of(adminRole));
		admin.setActive(true);
		userRepository.saveAndFlush(admin);
		String adminToken = jwtService.generateToken(adminEmail);

		mockMvc.perform(get("/api/admin/customers/" + customer.getId() + "/kyc/document")
						.header("Authorization", "Bearer " + customerToken))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/admin/customers/" + customer.getId() + "/kyc/document")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_PDF))
				.andExpect(content().bytes(pdf));
	}

	@Test
	void approvedVendorCanLoadRealDashboardAndVehicleList() throws Exception {
		String email = "approved-" + UUID.randomUUID() + "@example.com";
		Role vendorRole = roleRepository.findByName(RoleName.VENDOR).orElseThrow();
		User vendor = new User();
		vendor.setFirstName("Approved");
		vendor.setLastName("Vendor");
		vendor.setFullName("Approved Vendor");
		vendor.setEmail(email);
		vendor.setPassword("not-used-by-this-request");
		vendor.setRole(RoleName.VENDOR);
		vendor.setRoles(Set.of(vendorRole));
		vendor.setApprovalStatus("APPROVED");
		vendor.setActive(true);
		userRepository.saveAndFlush(vendor);
		String token = jwtService.generateToken(email);

		mockMvc.perform(get("/api/vendor/dashboard").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total_vehicles").value(0))
				.andExpect(jsonPath("$.monthlyEarnings").isArray());

		mockMvc.perform(get("/api/vendor/vehicles").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray())
				.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void approvedVendorCanCreateVehicleAndUploadPrivatePhotos() throws Exception {
		String email = "vehicle-vendor-" + UUID.randomUUID() + "@example.com";
		Role vendorRole = roleRepository.findByName(RoleName.VENDOR).orElseThrow();
		User vendor = new User();
		vendor.setFirstName("Vehicle");
		vendor.setLastName("Vendor");
		vendor.setFullName("Vehicle Vendor");
		vendor.setEmail(email);
		vendor.setPassword("not-used-by-this-request");
		vendor.setRole(RoleName.VENDOR);
		vendor.setRoles(Set.of(vendorRole));
		vendor.setApprovalStatus("APPROVED");
		vendor.setActive(true);
		userRepository.saveAndFlush(vendor);
		String token = jwtService.generateToken(email);
		String suffix = UUID.randomUUID().toString();

		Map<String, Object> vehicle = Map.ofEntries(
				Map.entry("category", "Car"),
				Map.entry("title", "Test vehicle"),
				Map.entry("brand", "Example"),
				Map.entry("model", "Model"),
				Map.entry("year", 2024),
				Map.entry("registrationNumber", "KA01AB" + suffix.substring(0, 4)),
				Map.entry("color", "Blue"),
				Map.entry("seatingCapacity", 5),
				Map.entry("mileage", 16.5),
				Map.entry("features", "Air conditioning, GPS"),
				Map.entry("dailyRate", 1800),
				Map.entry("hourlyRate", 250),
				Map.entry("securityDeposit", 5000),
				Map.entry("kmLimitPerDay", 150),
				Map.entry("extraKmCharge", 12),
				Map.entry("withDriverRate", 800),
				Map.entry("city", "Bengaluru"),
				Map.entry("location", "Central Bengaluru"));
		String created = mockMvc.perform(post("/api/vendor/vehicles")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsBytes(vehicle)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.registration_number").value("KA01AB" + suffix.substring(0, 4)))
				.andExpect(jsonPath("$.security_deposit").value(5000))
				.andReturn().getResponse().getContentAsString();
		long vehicleId = objectMapper.readTree(created).get("id").asLong();

		when(vendorDocumentStorage.store(any(), anyBoolean())).thenReturn(
				new VendorDocumentStorage.StoredFile(UUID.randomUUID() + ".jpg", ".jpg", "image/jpeg"));
		mockMvc.perform(multipart("/api/vendor/vehicles/" + vehicleId + "/media")
						.file(new MockMultipartFile("photos", "vehicle.jpg", "image/jpeg",
								new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff}))
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].media_type").value("PHOTO"))
				.andExpect(jsonPath("$[0].original_name").value("vehicle.jpg"));

		mockMvc.perform(get("/api/vendor/vehicles/" + vehicleId + "/media")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1));
	}

}
