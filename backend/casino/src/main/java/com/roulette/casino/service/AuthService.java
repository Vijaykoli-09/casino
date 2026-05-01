package com.roulette.casino.service;

import com.roulette.casino.dto.request.LoginRequest;
import com.roulette.casino.dto.request.PasscodeRequest;
import com.roulette.casino.dto.response.LoginResponse;
import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.UserRepository;
import com.roulette.casino.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository    userRepository;
    private final JwtService        jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder   passwordEncoder;

    @Value("${app.super-admin.username}")
    private String superAdminUsername;

    @Value("${app.super-admin.password}")
    private String superAdminPassword;

    @Value("${app.super-admin.passcode}")
    private String superAdminPasscode;

    // ── Login ─────────────────────────────────────────────────────────────────

    public LoginResponse login(LoginRequest request) {

        // Check if super admin trying to login
        if (request.getUsername().equals(superAdminUsername)) {
            return handleSuperAdminLogin(request);
        }

        // Normal login for ADMIN and PLAYER
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsername(),
                request.getPassword()
            )
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() ->
                    new RuntimeException("User not found")
                );

        String token = jwtService.generateToken(
            user.getUsername(),
            user.getRole().name()
        );

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole().name())
                .requiresPasscode(false)
                .build();
    }

    // ── Super Admin login ─────────────────────────────────────────────────────

    private LoginResponse handleSuperAdminLogin(LoginRequest request) {

        // Check super admin credentials manually
        // (super admin is not in DB, credentials are in application.properties)
        if (!request.getPassword().equals(superAdminPassword)) {
            throw new RuntimeException("Invalid credentials");
        }

        // Issue a temporary token — full access only after passcode
        String tempToken = jwtService.generateToken(
            superAdminUsername,
            Role.SUPER_ADMIN.name(),
            true // isTemp = true
        );

        return LoginResponse.builder()
                .token(tempToken)
                .userId(-1L)
                .username(superAdminUsername)
                .role(Role.SUPER_ADMIN.name())
                .requiresPasscode(true) // frontend must ask for passcode
                .build();
    }

    // ── Verify passcode ───────────────────────────────────────────────────────

    public LoginResponse verifyPasscode(PasscodeRequest request, String username) {

        // Must be super admin
        if (!username.equals(superAdminUsername)) {
            throw new RuntimeException("Not authorized");
        }

        // Check passcode
        if (!request.getPasscode().equals(superAdminPasscode)) {
            throw new RuntimeException("Invalid passcode");
        }

        // Issue full token
        String fullToken = jwtService.generateToken(
            superAdminUsername,
            Role.SUPER_ADMIN.name(),
            false // isTemp = false — full access
        );

        return LoginResponse.builder()
                .token(fullToken)
                .userId(-1L)
                .username(superAdminUsername)
                .role(Role.SUPER_ADMIN.name())
                .requiresPasscode(false)
                .build();
    }

    // ── Super admin init ──────────────────────────────────────────────────────
    // Called on app startup to ensure super admin exists in DB
    // We store super admin in DB so JwtAuthFilter can load UserDetails

  
}