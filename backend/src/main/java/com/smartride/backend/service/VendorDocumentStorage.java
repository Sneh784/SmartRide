package com.smartride.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

@Service
public class VendorDocumentStorage {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private final Path root;

    public VendorDocumentStorage(@Value("${smartride.uploads.vendor-dir:./private-uploads/vendors}") String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    public StoredFile store(MultipartFile file, boolean imageOnly) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Required vendor document is missing");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Each uploaded file must be 5 MB or smaller");
        }

        try {
            byte[] bytes = file.getBytes();
            String extension = detectedExtension(bytes, imageOnly);
            String key = UUID.randomUUID() + extension;
            Files.createDirectories(root);
            Files.write(root.resolve(key), bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            return new StoredFile(key, extension, extension.equals(".pdf") ? "application/pdf"
                    : extension.equals(".png") ? "image/png" : "image/jpeg");
        } catch (IOException exception) {
            throw new IllegalStateException("Could not securely store vendor document", exception);
        }
    }

    public Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!root.equals(resolved.getParent())) {
            throw new IllegalArgumentException("Invalid document reference");
        }
        return resolved;
    }

    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not remove incomplete vendor document", exception);
        }
    }

    private static String detectedExtension(byte[] bytes, boolean imageOnly) {
        if (bytes.length >= 5 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D'
                && bytes[3] == 'F' && bytes[4] == '-') {
            if (imageOnly) throw new IllegalArgumentException("Profile image must be PNG, JPG, or JPEG");
            return ".pdf";
        }
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P'
                && bytes[2] == 'N' && bytes[3] == 'G' && (bytes[4] & 0xff) == 0x0d
                && (bytes[5] & 0xff) == 0x0a && (bytes[6] & 0xff) == 0x1a
                && (bytes[7] & 0xff) == 0x0a) return ".png";
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) return ".jpg";
        throw new IllegalArgumentException("Documents must be valid PDF, PNG, JPG, or JPEG files");
    }

    public record StoredFile(String key, String extension, String contentType) { }
}
