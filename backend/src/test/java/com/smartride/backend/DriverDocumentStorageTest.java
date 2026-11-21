package com.smartride.backend;

import com.smartride.backend.driver.service.DriverDocumentStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DriverDocumentStorageTest {
    @TempDir
    Path tempDir;

    @Test
    void storesImagesWithGeneratedPrivateKeysAndRejectsNonImagesAsPhotos() {
        DriverDocumentStorage storage = new DriverDocumentStorage(tempDir.toString());
        byte[] png = new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a};
        MockMultipartFile photo = new MockMultipartFile("profilePhoto", "my-photo.png", "image/png", png);

        DriverDocumentStorage.StoredFile stored = storage.storeImage(photo);

        assertEquals("image/png", stored.contentType());
        assertEquals("my-photo.png", stored.originalName());
        assertTrue(Files.isRegularFile(storage.resolve(stored.key())));
        assertThrows(IllegalArgumentException.class, () -> storage.resolve("../outside.png"));
        assertThrows(IllegalArgumentException.class, () -> storage.storeImage(
                new MockMultipartFile("profilePhoto", "document.pdf", "application/pdf",
                        "%PDF-1.4 test".getBytes())));
    }
}
