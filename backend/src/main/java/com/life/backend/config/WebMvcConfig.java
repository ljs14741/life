package com.life.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.beans.factory.annotation.Value;

import java.nio.file.Path;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. 절대 경로로 변환
        Path root = Path.of(uploadDir).toAbsolutePath().normalize();
        String location = root.toUri().toString();

        if (!location.endsWith("/")) {
            location += "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}