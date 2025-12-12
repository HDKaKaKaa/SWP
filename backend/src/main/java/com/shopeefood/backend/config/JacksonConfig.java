package com.shopeefood.backend.config;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    /**
     * Định nghĩa ObjectMapper là một Spring Bean.
     * Bean này cho phép Spring tự động tiêm (autowire)
     * vào ProductService và các Controllers khác.
     */
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}