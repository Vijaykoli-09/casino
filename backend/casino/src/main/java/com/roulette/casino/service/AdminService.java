package com.roulette.casino.service;

import com.roulette.casino.dto.request.CreateUserRequest;
import com.roulette.casino.dto.request.UpdateBalanceRequest;
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
public class AdminService {

    private final UserRepository userRepository;
    private final BetRepository  betRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Create player ─────────────────────────────────────────────────────────

    @Transactional
public UserResponse createPlayer(CreateUserRequest request, String adminUsername) {

    if (userRepository.existsByUsername(request.getUsername())) {
        throw new RuntimeException("Username already exists");
    }

    // Balance required for player
    if (request.getBalance() == null) {
        throw new RuntimeException("Balance is required when creating a player");
    }

    User admin = userRepository.findByUsername(adminUsername)
            .orElseThrow(() -> new RuntimeException("Admin not found"));

    if (admin.getRole() != Role.ADMIN && admin.getRole() != Role.SUPER_ADMIN) {
        throw new RuntimeException("Not authorized to create players");
    }

    User player = User.builder()
            .username(request.getUsername())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .balance(request.getBalance())
            .role(Role.PLAYER)
            .createdBy(admin)
            .build();

    User saved = userRepository.save(player);
    return mapToUserResponse(saved);
}

    // ── Get all players under this admin ──────────────────────────────────────

    public List<UserResponse> getMyPlayers(String adminUsername) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        return userRepository.findByCreatedById(admin.getId())
                .stream()
                .filter(u -> u.getRole() == Role.PLAYER)
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ── Search players ────────────────────────────────────────────────────────

    public List<UserResponse> searchMyPlayers(String adminUsername, String search) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        return userRepository.searchPlayersByAdmin(admin.getId(), search)
                .stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ── Get single player ─────────────────────────────────────────────────────

    public UserResponse getPlayer(Long playerId, String adminUsername) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        User player = userRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        // Admin can only view his own players
        if (player.getCreatedBy() == null ||
            !player.getCreatedBy().getId().equals(admin.getId())) {
            throw new RuntimeException("Player does not belong to this admin");
        }

        return mapToUserResponse(player);
    }

    // ── Update balance ────────────────────────────────────────────────────────

    @Transactional
    public UserResponse updateBalance(
            Long playerId,
            UpdateBalanceRequest request,
            String adminUsername) {

        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        User player = userRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        // Verify ownership
        if (player.getCreatedBy() == null ||
            !player.getCreatedBy().getId().equals(admin.getId())) {
            throw new RuntimeException("Player does not belong to this admin");
        }

        BigDecimal newBalance = player.getBalance().add(request.getAmount());

        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Balance cannot go below zero");
        }

        player.setBalance(newBalance);
        User saved = userRepository.save(player);
        return mapToUserResponse(saved);
    }

    // ── Map helper ────────────────────────────────────────────────────────────

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .balance(user.getBalance())
                .role(user.getRole().name())
                .createdById(user.getCreatedBy() != null
                    ? user.getCreatedBy().getId() : null)
                .createdByUsername(user.getCreatedBy() != null
                    ? user.getCreatedBy().getUsername() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}