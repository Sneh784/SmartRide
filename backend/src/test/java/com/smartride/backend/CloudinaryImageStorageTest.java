package com.smartride.backend;

import com.smartride.backend.service.CloudinaryImageStorage;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CloudinaryImageStorageTest {
    @Test
    void reportsMissingCloudinaryConfigurationWhenPhotoUploadIsAttempted() {
        CloudinaryImageStorage storage = new CloudinaryImageStorage("", "", "");
        MockMultipartFile photo = new MockMultipartFile("photo", "vehicle.png", "image/png",
                new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a});

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> storage.store(photo));

        assertEquals(503, exception.getStatusCode().value());
    }

    @Test
    void buildsSecureDeliveryUrlFromStoredCloudinaryKey() {
        CloudinaryImageStorage storage = new CloudinaryImageStorage("smartride", "key", "secret");

        assertEquals("https://res.cloudinary.com/smartride/image/upload/v1234567890/smartride/vehicles/image-id",
                storage.secureUrl("cloudinary:1234567890:smartride/vehicles/image-id"));
    }
}
