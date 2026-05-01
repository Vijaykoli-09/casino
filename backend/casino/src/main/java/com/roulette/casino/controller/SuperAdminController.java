package com.roulette.casino.controller;

import com.roulette.casino.dto.request.CreateUserRequest;
import com.roulette.casino.dto.response.AdminDetailResponse;
import com.roulette.casino.dto.response.AdminProfitResponse;
import com.roulette.casino.dto.response.UserResponse;
import com.roulette.casino.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/super-admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    // POST /api/super-admin/admins — create admin
    @PostMapping("/admins")
    public ResponseEntity<UserResponse> createAdmin(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            superAdminService.createAdmin(request, userDetails.getUsername())
        );
    }

    // GET /api/super-admin/admins — get all admins
    @GetMapping("/admins")
    public ResponseEntity<List<UserResponse>> getAllAdmins() {
        return ResponseEntity.ok(superAdminService.getAllAdmins());
    }

    // GET /api/super-admin/admins/search?q=username
    @GetMapping("/admins/search")
    public ResponseEntity<List<UserResponse>> searchAdmins(
            @RequestParam String q) {
        return ResponseEntity.ok(superAdminService.searchAdmins(q));
    }

    // GET /api/super-admin/admins/{id} — admin detail + players + profit
    @GetMapping("/admins/{id}")
    public ResponseEntity<AdminDetailResponse> getAdminDetail(
            @PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.getAdminDetail(id));
    }

    // GET /api/super-admin/admins/{id}/players — all players under admin
    @GetMapping("/admins/{id}/players")
    public ResponseEntity<List<UserResponse>> getAdminPlayers(
            @PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.getAdminPlayers(id));
    }

    // DELETE /api/super-admin/admins/{id} — delete admin
    @DeleteMapping("/admins/{id}")
    public ResponseEntity<Void> deleteAdmin(@PathVariable Long id) {
        superAdminService.deleteAdmin(id);
        return ResponseEntity.noContent().build();
    }
    // GET /api/super-admin/admins/{id}/profit?from=2026-04-01&to=2026-05-01
@GetMapping("/admins/{id}/profit")
public ResponseEntity<AdminProfitResponse> getAdminProfit(
        @PathVariable Long id,
        @RequestParam String from,
        @RequestParam String to) {
    return ResponseEntity.ok(
        superAdminService.getAdminProfit(id, from, to)
    );
}
}