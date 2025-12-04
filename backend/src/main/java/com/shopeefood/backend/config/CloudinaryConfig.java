package com.shopeefood.backend.config;

import com.cloudinary.Cloudinary;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary() {
        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", "dmok3b0h0");
        config.put("api_key", "546496225469168");
        config.put("api_secret", "yb7u-wwoXTIt3GNl4YokxHUmzuU");
        return new Cloudinary(config);
    }
}