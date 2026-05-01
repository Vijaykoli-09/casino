package com.roulette.casino.controller;

import com.roulette.casino.dto.request.LoginRequest;
import com.roulette.casino.dto.request.PasscodeRequest;
import com.roulette.casino.dto.response.LoginResponse;
import com.roulette.casino.security.JwtService;
import com.roulette.casino.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService  jwtService;

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // POST /api/auth/verify-passcode
    @PostMapping("/verify-passcode")
    public ResponseEntity<LoginResponse> verifyPasscode(
            @Valid @RequestBody PasscodeRequest request,
            HttpServletRequest httpRequest) {

        // Extract username from the Bearer token manually
        String authHeader = httpRequest.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }

        String token    = authHeader.substring(7);
        String username = jwtService.extractUsername(token);

        // Make sure it's a temp token
        if (!jwtService.isTokenTemp(token)) {
            return ResponseEntity
                .status(403)
                .body(null);
        }

        return ResponseEntity.ok(
            authService.verifyPasscode(request, username)
        );
    }
}