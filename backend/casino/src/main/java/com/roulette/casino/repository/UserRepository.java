package com.roulette.casino.repository;

import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // ── Plain lookups (no createdBy needed — used by auth / existence checks) ─

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    // ── Lookups that need createdBy (feed into mapToUserResponse) ─────────────
    //
    // @EntityGraph does a LEFT JOIN FETCH on createdBy in the same SQL query.
    // Result: proxy is already initialised when the method returns — no N+1,
    // no lazy-load-outside-session error.

    @EntityGraph(attributePaths = "createdBy")
    List<User> findByRole(Role role);

    @EntityGraph(attributePaths = "createdBy")
    List<User> findByCreatedById(Long adminId);

    @EntityGraph(attributePaths = "createdBy")
    List<User> findByRoleAndCreatedById(Role role, Long createdById);

    /**
     * Single user by id with createdBy eagerly fetched.
     *
     * We cannot use the derived-query name "findWithCreatedByById" because
     * Spring Data tries to parse "WithCreatedByById" as a property path on
     * User and fails at startup. Using @Query bypasses the parser entirely.
     */
    @EntityGraph(attributePaths = "createdBy")
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithCreatedBy(@Param("id") Long id);

    // ── Search queries ────────────────────────────────────────────────────────

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.createdBy " +
           "WHERE u.createdBy.id = :adminId " +
           "AND u.role = 'PLAYER' " +
           "AND LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<User> searchPlayersByAdmin(
        @Param("adminId") Long adminId,
        @Param("search")  String search
    );

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.createdBy " +
           "WHERE u.role = 'ADMIN' " +
           "AND LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<User> searchAdmins(@Param("search") String search);
}