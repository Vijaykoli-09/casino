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
public class BetResponse {
    private Long id;
    private Long roundId;
    private String betType;
    private String betValue;
    private BigDecimal amount;
    private BigDecimal winAmount;
    private boolean isSettled;
    private LocalDateTime createdAt;
}