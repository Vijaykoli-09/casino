package com.roulette.casino.config;

import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.super-admin.username}")
    private String superAdminUsername;

    @Value("${app.super-admin.password}")
    private String superAdminPassword;

    @Override
    public void run(ApplicationArguments args) {
        log.info("🔍 DataInitializer: Checking for super admin user...");
        
        if (!userRepository.existsByUsername(superAdminUsername)) {
            log.info("Creating new super admin: {}", superAdminUsername);
            
            User superAdmin = User.builder()
                    .username(superAdminUsername)
                    .passwordHash(passwordEncoder.encode(superAdminPassword))
                    .role(Role.SUPER_ADMIN)
                    .balance(java.math.BigDecimal.ZERO)
                    .build();
            
            User saved = userRepository.save(superAdmin);
            log.info("✅ Super admin created successfully: id={}, username={}, role={}", 
                saved.getId(), saved.getUsername(), saved.getRole());
        } else {
            log.info("✅ Super admin already exists: {}", superAdminUsername);
            User existing = userRepository.findByUsername(superAdminUsername).get();
            log.debug("   id={}, role={}", existing.getId(), existing.getRole());
        }
    }
}