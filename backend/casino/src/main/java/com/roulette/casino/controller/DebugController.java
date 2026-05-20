package com.roulette.casino.controller;

import com.roulette.casino.dto.response.UserResponse;
import com.roulette.casino.model.Role;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.UserRepository;
import com.roulette.casino.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
public class DebugController {

    private final UserRepository userRepository;
    private final AdminService adminService;

    /**
     * Debug endpoint to check all users in the database and their roles
     */
    @GetMapping("/users")
    public Map<String, Object> getAllUsers() {
        Map<String, Object> response = new HashMap<>();
        
        List<User> allUsers = userRepository.findAll();
        response.put("totalUsers", allUsers.size());
        
        Map<String, Integer> roleCount = new HashMap<>();
        roleCount.put("ADMIN", 0);
        roleCount.put("PLAYER", 0);
        roleCount.put("SUPER_ADMIN", 0);
        
        for (User user : allUsers) {
            String roleName = user.getRole().name();
            roleCount.put(roleName, roleCount.getOrDefault(roleName, 0) + 1);
        }
        
        response.put("roleCount", roleCount);
        response.put("users", allUsers);
        
        return response;
    }

    /**
     * Check specifically for ADMIN role users
     */
    @GetMapping("/admins")
    public Map<String, Object> getAdminsDebug() {
        Map<String, Object> response = new HashMap<>();
        
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        response.put("totalAdmins", admins.size());
        
        List<UserResponse> adminResponses = admins.stream()
                .map(adminService::mapToUserResponse)
                .collect(Collectors.toList());
        
        response.put("admins", adminResponses);
        
        if (admins.isEmpty()) {
            response.put("⚠️ WARNING", "No admins found in database. Check if admins were created or if role was set correctly.");
        }
        
        return response;
    }

    /**
     * Check superadmin in database
     */
    @GetMapping("/superadmin")
    public Map<String, Object> getSuperAdminDebug() {
        Map<String, Object> response = new HashMap<>();
        
        var superAdmin = userRepository.findByUsername("superadmin");
        
        if (superAdmin.isPresent()) {
            User user = superAdmin.get();
            response.put("found", true);
            response.put("username", user.getUsername());
            response.put("role", user.getRole().name());
            response.put("id", user.getId());
            response.put("message", "✅ Super admin found in database");
        } else {
            response.put("found", false);
            response.put("message", "❌ Super admin NOT found in database. DataInitializer may have failed.");
        }
        
        return response;
    }

    /**
     * Comprehensive database status check
     */
    @GetMapping("/status")
    public Map<String, Object> getStatusCheck() {
        Map<String, Object> status = new HashMap<>();
        
        // Check super admin
        var superAdminOpt = userRepository.findByUsername("superadmin");
        status.put("superAdminExists", superAdminOpt.isPresent());
        
        // Check admins
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        status.put("adminCount", admins.size());
        status.put("adminDetails", admins.stream()
                .map(a -> Map.of(
                    "id", a.getId(),
                    "username", a.getUsername(),
                    "role", a.getRole().name(),
                    "createdBy", a.getCreatedBy() != null ? a.getCreatedBy().getUsername() : "null"
                ))
                .collect(Collectors.toList()));
        
        // Check players
        List<User> players = userRepository.findByRole(Role.PLAYER);
        status.put("playerCount", players.size());
        
        // Total users
        status.put("totalUsers", userRepository.count());
        
        // Summary
        Map<String, String> summary = new HashMap<>();
        if (!superAdminOpt.isPresent()) {
            summary.put("issue1", "❌ Super admin not in database - DataInitializer may have failed");
        }
        if (admins.isEmpty()) {
            summary.put("issue2", "❌ No admins found - they may not have been created or role is incorrect");
        }
        if (admins.isEmpty() && superAdminOpt.isPresent()) {
            summary.put("actionRequired", "Create admins using the super admin account");
        }
        
        status.put("issues", summary);
        
        return status;
    }
}
