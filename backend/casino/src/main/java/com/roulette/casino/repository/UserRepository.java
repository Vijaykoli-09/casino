package com.roulette.casino.repository;

import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    // All users by role
    List<User> findByRole(Role role);

    // All players created by a specific admin
    List<User> findByCreatedById(Long adminId);

    // All admins created by super admin
    List<User> findByRoleAndCreatedById(Role role, Long createdById);

    // Search players by username under a specific admin
    @Query("SELECT u FROM User u WHERE u.createdBy.id = :adminId " +
           "AND u.role = 'PLAYER' " +
           "AND LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<User> searchPlayersByAdmin(
        @Param("adminId") Long adminId,
        @Param("search") String search
    );

    // Search all admins
    @Query("SELECT u FROM User u WHERE u.role = 'ADMIN' " +
           "AND LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<User> searchAdmins(@Param("search") String search);
}