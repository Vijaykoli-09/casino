package com.roulette.casino.controller;

import com.roulette.casino.dto.request.CreateUserRequest;
import com.roulette.casino.dto.request.UpdateBalanceRequest;
import com.roulette.casino.dto.response.UserResponse;
import com.roulette.casino.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // POST /api/admin/players — create player
    @PostMapping("/players")
    public ResponseEntity<UserResponse> createPlayer(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            adminService.createPlayer(request, userDetails.getUsername())
        );
    }

    // GET /api/admin/players — get all my players
    @GetMapping("/players")
    public ResponseEntity<List<UserResponse>> getMyPlayers(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            adminService.getMyPlayers(userDetails.getUsername())
        );
    }

    // GET /api/admin/players/search?q=username
    @GetMapping("/players/search")
    public ResponseEntity<List<UserResponse>> searchPlayers(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            adminService.searchMyPlayers(userDetails.getUsername(), q)
        );
    }

    // GET /api/admin/players/{id} — get single player
    @GetMapping("/players/{id}")
    public ResponseEntity<UserResponse> getPlayer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            adminService.getPlayer(id, userDetails.getUsername())
        );
    }

    // PUT /api/admin/players/{id}/balance — update balance
    @PutMapping("/players/{id}/balance")
    public ResponseEntity<UserResponse> updateBalance(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBalanceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            adminService.updateBalance(id, request, userDetails.getUsername())
        );
    }
}