package com.roulette.casino.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.PLAYER;

    /**
     * Kept LAZY — changing to EAGER would cause a JOIN on every single user
     * query in the system, including high-frequency ones like JWT auth checks
     * (UserDetailsServiceImpl.loadUserByUsername).
     *
     * Instead, all service methods that access createdBy are annotated with
     * @Transactional(readOnly = true) to keep the session open, and the
     * repository uses @EntityGraph to LEFT JOIN FETCH createdBy in a single
     * query — no N+1, no lazy-load-outside-session errors.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}