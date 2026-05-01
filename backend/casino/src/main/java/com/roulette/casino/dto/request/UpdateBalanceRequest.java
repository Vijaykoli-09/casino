package com.roulette.casino.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateBalanceRequest {

    @NotNull(message = "Amount is required")
    private BigDecimal amount;
}