package com.roulette.casino.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private BigDecimal balance;
    private String role;
    private Long createdById;
    private String createdByUsername;
    private LocalDateTime createdAt;
}