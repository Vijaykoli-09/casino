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

    private final UserRepository  userRepository;
    private final BetRepository   betRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Create player ─────────────────────────────────────────────────────────

    @Transactional
    public UserResponse createPlayer(CreateUserRequest request, String adminUsername) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

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

    /**
     * @Transactional(readOnly = true) keeps the Hibernate session open for
     * the entire method, so any lazy relation touched inside mapToUserResponse
     * (or anywhere in the call chain) can still be loaded.
     *
     * readOnly = true also tells Hibernate to skip dirty-checking on entities,
     * which gives a small performance boost on read-heavy paths.
     *
     * The @EntityGraph on findByCreatedById() additionally ensures createdBy
     * is fetched in ONE query (no N+1), so even if the session were closed
     * the proxy would already be initialised.
     */
    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public List<UserResponse> searchMyPlayers(String adminUsername, String search) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        return userRepository.searchPlayersByAdmin(admin.getId(), search)
                .stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ── Get single player ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UserResponse getPlayer(Long playerId, String adminUsername) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        // Use findByIdWithCreatedBy so createdBy is eagerly fetched in one query
        User player = userRepository.findByIdWithCreatedBy(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

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

        // Use findByIdWithCreatedBy so createdBy is available for the ownership
        // check AND for mapToUserResponse — no extra query needed
        User player = userRepository.findByIdWithCreatedBy(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

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

    /**
     * Reads createdBy ONCE per user and caches it in a local variable.
     *
     * The original code called user.getCreatedBy() twice in separate ternary
     * expressions. Each call is a potential Hibernate proxy initialisation.
     * Storing the result in a local variable:
     *   - Is safe whether the session is open or not (proxy already init'd
     *     by @EntityGraph before this is called)
     *   - Avoids touching the proxy a second time unnecessarily
     */
    public UserResponse mapToUserResponse(User user) {
        User createdBy = user.getCreatedBy(); // single proxy access
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .balance(user.getBalance())
                .role(user.getRole().name())
                .createdById(createdBy != null ? createdBy.getId() : null)
                .createdByUsername(createdBy != null ? createdBy.getUsername() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}