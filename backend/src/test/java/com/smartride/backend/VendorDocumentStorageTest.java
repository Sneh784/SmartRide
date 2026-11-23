package com.smartride.backend;

import com.smartride.backend.service.VendorDocumentStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VendorDocumentStorageTest {
    @TempDir
    Path tempDir;

    @Test
    void storesPdfAndImagePrivatelyAndRejectsSpoofedOrUnsafeFiles() {
        VendorDocumentStorage storage = new VendorDocumentStorage(tempDir.toString());
        var pdf = storage.store(new MockMultipartFile("document", "identity.pdf", "application/pdf",
                "%PDF-1.4 test".getBytes()), false);
        byte[] pngBytes = {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a};
        var image = storage.store(new MockMultipartFile("profileImage", "profile.png", "image/png", pngBytes), true);

        assertEquals("application/pdf", pdf.contentType());
        assertEquals("image/png", image.contentType());
        assertTrue(Files.isRegularFile(storage.resolve(pdf.key())));
        assertTrue(Files.isRegularFile(storage.resolve(image.key())));
        assertThrows(IllegalArgumentException.class, () -> storage.store(
                new MockMultipartFile("profileImage", "fake.png", "image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G'}), true));
        assertThrows(IllegalArgumentException.class, () -> storage.store(
                new MockMultipartFile("profileImage", "fake.pdf", "application/pdf",
                        "%PDF-1.4 test".getBytes()), true));
        assertThrows(IllegalArgumentException.class, () -> storage.resolve("../private.pdf"));
    }
}
