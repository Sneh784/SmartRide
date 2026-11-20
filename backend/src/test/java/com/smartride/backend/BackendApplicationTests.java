package com.smartride.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.repository.VendorApplicationRepository;
import com.smartride.backend.security.JwtService;
import com.smartride.backend.service.VendorDocumentStorage;
import org.junit.jupiter.api.Test;
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
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
	private JdbcTemplate jdbc;

	@MockBean
	private VendorDocumentStorage vendorDocumentStorage;

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
		createVendorProfile(vendor);
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
		createVendorProfile(vendor);
		String token = jwtService.generateToken(email);
		String suffix = UUID.randomUUID().toString();

		Map<String, Object> vehicle = Map.ofEntries(
				Map.entry("category", "Cars"),
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

	private void createVendorProfile(User vendor) {
		jdbc.update("""
				INSERT INTO vendor_profiles (
					user_id, business_name, business_type, business_email, business_phone,
					address, city, state, pin_code
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				""", vendor.getId(), "Test Rentals", "Individual", vendor.getEmail(),
				"9876543210", "1 Test Street", "Bengaluru", "Karnataka", "560001");
	}

}
