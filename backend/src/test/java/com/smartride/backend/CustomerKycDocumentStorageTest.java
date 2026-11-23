package com.smartride.backend;

import com.smartride.backend.service.CustomerKycDocumentStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CustomerKycDocumentStorageTest {
    @TempDir
    Path tempDir;

    @Test
    void storesByGeneratedKeyAndRejectsSpoofedContentAndTraversal() {
        CustomerKycDocumentStorage storage = new CustomerKycDocumentStorage(tempDir.toString());
        MockMultipartFile file = new MockMultipartFile("document", "identity.pdf", "application/pdf",
                "%PDF-1.4 test".getBytes());
        var stored = storage.store(file);

        assertTrue(Files.isRegularFile(storage.resolve(stored.key())));
        assertThrows(IllegalArgumentException.class, () -> storage.store(
                new MockMultipartFile("document", "fake.pdf", "application/pdf", "not a pdf".getBytes())));
        assertThrows(IllegalArgumentException.class, () -> storage.resolve("../private.pdf"));
    }
}
