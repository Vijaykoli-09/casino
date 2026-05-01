package com.roulette.casino.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProfitResponse {
    private Long            adminId;
    private String          adminUsername;
    private int             totalPlayers;
    private BigDecimal      totalBets;
    private BigDecimal      totalPayouts;
    private BigDecimal      adminProfit;
    private BigDecimal      superAdminShare;   // 30% of profit
    private String          fromDate;
    private String          toDate;
    private List<UserResponse> players;
}