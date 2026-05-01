package com.roulette.casino.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDetailResponse {
    private Long id;
    private String username;
    private String role;
    private BigDecimal totalProfit;
    private int totalPlayers;
    private List<UserResponse> players;
    private LocalDateTime createdAt;
}