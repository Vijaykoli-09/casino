package com.roulette.casino.config;

import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

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
        if (!userRepository.existsByUsername(superAdminUsername)) {
            User superAdmin = User.builder()
                    .username(superAdminUsername)
                    .passwordHash(passwordEncoder.encode(superAdminPassword))
                    .role(Role.SUPER_ADMIN)
                    .balance(java.math.BigDecimal.ZERO)
                    .build();
            userRepository.save(superAdmin);
            System.out.println("✅ Super admin created: " + superAdminUsername);
        } else {
            System.out.println("✅ Super admin already exists: " + superAdminUsername);
        }
    }
}