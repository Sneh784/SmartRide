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
public class CustomerKycDocumentStorage {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private final Path root;

    public CustomerKycDocumentStorage(
            @Value("${smartride.uploads.customer-kyc-dir:./private-uploads/customer-kyc}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Select a verification document");
        if (file.getSize() > MAX_BYTES) throw new IllegalArgumentException("Verification documents must be 5 MB or smaller");

        try {
            byte[] bytes = file.getBytes();
            String extension = detectedExtension(bytes);
            String key = UUID.randomUUID() + extension;
            Files.createDirectories(root);
            Files.write(root.resolve(key), bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);

            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isBlank()) originalName = "identity-document" + extension;
            originalName = originalName.replace('\\', '/');
            originalName = originalName.substring(originalName.lastIndexOf('/') + 1)
                    .replaceAll("[\\p{Cntrl}]", "_");
            if (originalName.isBlank()) originalName = "identity-document" + extension;
            if (originalName.length() > 255) originalName = originalName.substring(originalName.length() - 255);
            String contentType = switch (extension) {
                case ".pdf" -> "application/pdf";
                case ".png" -> "image/png";
                default -> "image/jpeg";
            };
            return new StoredFile(key, originalName, contentType);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not securely store verification document", exception);
        }
    }

    public Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!root.equals(resolved.getParent())) throw new IllegalArgumentException("Invalid document reference");
        return resolved;
    }

    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not remove verification document", exception);
        }
    }

    private static String detectedExtension(byte[] bytes) {
        if (bytes.length >= 5 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D'
                && bytes[3] == 'F' && bytes[4] == '-') return ".pdf";
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P'
                && bytes[2] == 'N' && bytes[3] == 'G' && (bytes[4] & 0xff) == 0x0d
                && (bytes[5] & 0xff) == 0x0a && (bytes[6] & 0xff) == 0x1a
                && (bytes[7] & 0xff) == 0x0a) return ".png";
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) return ".jpg";
        throw new IllegalArgumentException("Verification document must be a valid PDF, PNG, JPG, or JPEG file");
    }

    public record StoredFile(String key, String originalName, String contentType) { }
}
