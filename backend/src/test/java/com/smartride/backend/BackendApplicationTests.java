package com.smartride.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartride.backend.repository.VendorApplicationRepository;
import com.smartride.backend.service.VendorDocumentStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "smartride.admin.initialization-enabled=false")
@AutoConfigureMockMvc
class BackendApplicationTests {
	@Autowired
	private VendorApplicationRepository vendorApplicationRepository;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

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

		var application = Map.of(
				"fullName", "Integration Vendor",
				"email", email,
				"mobileNumber", "9876543210",
				"password", "StrongPass1!",
				"confirmPassword", "StrongPass1!",
				"businessName", "Integration Rentals",
				"businessType", "Individual",
				"businessEmail", "business-" + suffix + "@example.com",
				"businessMobile", "9876543211",
				"businessAddress", "1 Test Street",
				"city", "Bengaluru",
				"state", "Karnataka",
				"pincode", "560001",
				"termsAccepted", true,
				"vendorPoliciesAccepted", true);
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
	}

}
