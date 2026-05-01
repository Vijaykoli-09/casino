package com.roulette.casino.controller;

import com.roulette.casino.dto.request.PlaceBetRequest;
import com.roulette.casino.dto.response.BetResponse;
import com.roulette.casino.dto.response.RoundResponse;
import com.roulette.casino.service.BetService;
import com.roulette.casino.service.RoundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLAYER')")
public class GameController {

    private final RoundService roundService;
    private final BetService   betService;

    // GET /api/game/round/current
    @GetMapping("/round/current")
    public ResponseEntity<RoundResponse> getCurrentRound(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            roundService.getCurrentRoundResponse(userDetails.getUsername())
        );
    }

    // POST /api/game/bet
    @PostMapping("/bet")
    public ResponseEntity<Map<String, Object>> placeBet(
            @Valid @RequestBody PlaceBetRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        BetResponse bet = betService.placeBet(request, userDetails.getUsername());

        return ResponseEntity.ok(Map.of(
            "success",    true,
            "bet",        bet,
            "newBalance", betService.getUserBalance(userDetails.getUsername())
        ));
    }

    // GET /api/game/bets/history
    @GetMapping("/bets/history")
    public ResponseEntity<List<BetResponse>> getBetHistory(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
            betService.getBetHistory(userDetails.getUsername())
        );
    }

    // GET /api/game/balance
    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalance(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(Map.of(
            "balance", betService.getUserBalance(userDetails.getUsername())
        ));
    }
}