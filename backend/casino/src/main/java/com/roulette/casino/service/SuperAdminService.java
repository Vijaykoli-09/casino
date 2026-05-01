package com.roulette.casino.service;

import com.roulette.casino.dto.request.CreateUserRequest;
import com.roulette.casino.dto.response.AdminDetailResponse;
import com.roulette.casino.dto.response.UserResponse;
import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.BetRepository;
import com.roulette.casino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final UserRepository  userRepository;
    private final BetRepository   betRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminService    adminService;

    // ── Create admin (username + password only, no balance) ───────────────────

    @Transactional
    public UserResponse createAdmin(
            CreateUserRequest request,
            String superAdminUsername) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        User superAdmin = userRepository.findByUsername(superAdminUsername)
                .orElseThrow(() -> new RuntimeException("Super admin not found"));

        User admin = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .balance(BigDecimal.ZERO)
                .role(Role.ADMIN)
                .createdBy(superAdmin)
                .build();

        User saved = userRepository.save(admin);
        return adminService.mapToUserResponse(saved);
    }

    // ── Get all admins ────────────────────────────────────────────────────────

    public List<UserResponse> getAllAdmins() {
        return userRepository.findByRole(Role.ADMIN)
                .stream()
                .map(adminService::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ── Search admins ─────────────────────────────────────────────────────────

    public List<UserResponse> searchAdmins(String search) {
        return userRepository.searchAdmins(search)
                .stream()
                .map(adminService::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ── Get admin detail with players + profit ────────────────────────────────

    public AdminDetailResponse getAdminDetail(Long adminId) {

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new RuntimeException("User is not an admin");
        }

        List<UserResponse> players = userRepository
                .findByCreatedById(adminId)
                .stream()
                .filter(u -> u.getRole() == Role.PLAYER)
                .map(adminService::mapToUserResponse)
                .collect(Collectors.toList());

        BigDecimal totalProfit = betRepository.calculateAdminProfit(adminId);

        return AdminDetailResponse.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .role(admin.getRole().name())
                .totalProfit(totalProfit)
                .totalPlayers(players.size())
                .players(players)
                .createdAt(admin.getCreatedAt())
                .build();
    }

    // ── Get all players under an admin ────────────────────────────────────────

    public List<UserResponse> getAdminPlayers(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new RuntimeException("User is not an admin");
        }

        return userRepository.findByCreatedById(adminId)
                .stream()
                .filter(u -> u.getRole() == Role.PLAYER)
                .map(adminService::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ── Delete admin ──────────────────────────────────────────────────────────

    @Transactional
    public void deleteAdmin(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new RuntimeException("User is not an admin");
        }

        userRepository.delete(admin);
    }
}