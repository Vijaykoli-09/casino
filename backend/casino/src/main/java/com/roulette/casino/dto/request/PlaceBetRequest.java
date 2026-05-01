package com.roulette.casino.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PlaceBetRequest {

    @NotNull(message = "Round ID is required")
    private Long roundId;

    @NotBlank(message = "Bet type is required")
    private String betType; // RED, BLACK, NUMBER

    private String betValue; // only for NUMBER bets

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.0", message = "Minimum bet is 1")
    private BigDecimal amount;
}