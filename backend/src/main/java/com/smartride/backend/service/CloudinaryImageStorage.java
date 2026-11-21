package com.smartride.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudinaryImageStorage {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private final String cloudName;
    private final Cloudinary cloudinary;

    public CloudinaryImageStorage(@Value("${smartride.cloudinary.cloud-name:}") String cloudName,
                                  @Value("${smartride.cloudinary.api-key:}") String apiKey,
                                  @Value("${smartride.cloudinary.api-secret:}") String apiSecret) {
        this.cloudName = cloudName.trim();
        this.cloudinary = cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank() ? null
                : new Cloudinary(ObjectUtils.asMap("cloud_name", cloudName.trim(), "api_key", apiKey.trim(),
                "api_secret", apiSecret.trim(), "secure", true));
    }

    public StoredAsset store(MultipartFile file, String folder, boolean imageOnly) {
        if (file == null || file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a file to upload");
        if (file.getSize() > MAX_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Each uploaded file must be 5 MB or smaller");
        if (cloudinary == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Cloudinary is not configured");
        try {
            byte[] bytes = file.getBytes();
            String contentType = detectType(bytes, imageOnly);
            String resourceType = contentType.startsWith("image/") ? "image" : "raw";
            String extension = contentType.equals("application/pdf") ? ".pdf"
                    : contentType.equals("image/png") ? ".png" : ".jpg";
            String generatedId = UUID.randomUUID().toString() + ("raw".equals(resourceType) ? extension : "");
            Map<?, ?> result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap("resource_type", resourceType,
                    "folder", folder, "public_id", generatedId, "overwrite", false));
            String publicId = String.valueOf(result.get("public_id"));
            String url = String.valueOf(result.get("secure_url"));
            if (publicId.isBlank() || url.isBlank() || !url.startsWith("https://")) throw new IllegalStateException("Cloudinary returned incomplete upload details");
            return new StoredAsset(publicId, url, safeOriginalName(file.getOriginalFilename()), contentType, resourceType);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloudinary upload failed", exception);
        }
    }

    public StoredImage store(MultipartFile file) {
        StoredAsset asset = store(file, "smartride/vehicles/photos", true);
        return new StoredImage("cloudinary:" + System.currentTimeMillis() / 1000 + ":" + asset.publicId(),
                extension(asset.contentType()), asset.contentType());
    }

    public void delete(String publicId, String resourceType) {
        if (publicId == null || publicId.isBlank()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cloudinary publicId is missing");
        if (cloudinary == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Cloudinary is not configured");
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
            Object status = result.get("result");
            if (!"ok".equals(status) && !"not found".equals(status)) throw new IllegalStateException("Cloudinary did not confirm deletion");
        } catch (ResponseStatusException exception) { throw exception; }
        catch (IOException | RuntimeException exception) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloudinary deletion failed", exception); }
    }

    public void delete(String storageKey) { delete(publicId(storageKey), "image"); }
    public String secureUrl(String storageKey) {
        if (!isCloudinaryKey(storageKey) || cloudName.isBlank()) throw new IllegalArgumentException("Invalid Cloudinary image key");
        return "https://res.cloudinary.com/" + cloudName + "/image/upload/v" + version(storageKey) + "/" + publicId(storageKey);
    }
    public static boolean isCloudinaryKey(String key) { return key != null && key.startsWith("cloudinary:"); }
    private static String publicId(String key) { int i = key.indexOf(':', 11); if (i < 0) throw new IllegalArgumentException("Invalid Cloudinary key"); return key.substring(i + 1); }
    private static String version(String key) { int i = key.indexOf(':', 11); if (i < 0) throw new IllegalArgumentException("Invalid Cloudinary key"); return key.substring(11, i); }
    private static String extension(String type) { return type.equals("image/png") ? ".png" : type.equals("application/pdf") ? ".pdf" : ".jpg"; }
    private static String safeOriginalName(String original) {
        String normalized = (original == null ? "upload" : original).replace('\\', '/');
        String name = normalized.substring(normalized.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isBlank()) name = "upload";
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }
    private static String detectType(byte[] b, boolean imageOnly) {
        if (b.length >= 5 && b[0]=='%' && b[1]=='P' && b[2]=='D' && b[3]=='F' && b[4]=='-') {
            if (imageOnly) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image must be PNG, JPG, or JPEG"); return "application/pdf";
        }
        if (b.length>=8 && (b[0]&255)==137 && b[1]=='P' && b[2]=='N' && b[3]=='G') return "image/png";
        if (b.length>=3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255) return "image/jpeg";
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, imageOnly ? "Image must be valid PNG, JPG, or JPEG" : "File must be valid PDF, PNG, JPG, or JPEG");
    }
    public record StoredAsset(String publicId, String secureUrl, String originalName, String contentType, String resourceType) { }
    public record StoredImage(String key, String extension, String contentType) { }
}
