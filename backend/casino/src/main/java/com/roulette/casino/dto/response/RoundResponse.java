package com.roulette.casino.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoundResponse {
    private Long id;
    private String status;
    private int secondsLeft;
    private Integer resultNumber;
    private List<Integer> lastResults;
    private java.math.BigDecimal balance;
}