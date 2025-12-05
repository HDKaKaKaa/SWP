package com.shopeefood.backend.controller;

import com.shopeefood.backend.service.CloudinaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin("*")
public class FileUploadController {

    @Autowired
    private CloudinaryService cloudinaryService;

    @PostMapping("/image")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Gọi service để upload lên Cloudinary
            String imageUrl = cloudinaryService.uploadImage(file);

            // Trả về URL của Cloudinary
            return ResponseEntity.ok(imageUrl);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi upload ảnh: " + e.getMessage());
        }
    }
}