package com.roulette.casino.service;

import com.roulette.casino.dto.request.PlaceBetRequest;
import com.roulette.casino.dto.response.BetResponse;
import com.roulette.casino.model.*;
import com.roulette.casino.repository.BetRepository;
import com.roulette.casino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BetService {

    private final BetRepository  betRepository;
    private final UserRepository userRepository;
    private final RoundService   roundService;

    // Red numbers in roulette
    private static final Set<Integer> RED_NUMBERS = Set.of(
        1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
    );

    // ── Place bet ─────────────────────────────────────────────────────────────

    @Transactional
    public BetResponse placeBet(PlaceBetRequest request, String username) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Round round = roundService.getCurrentRound();

        // Validate round is open for betting
        if (round.getStatus() != RoundStatus.BETTING_OPEN) {
            throw new RuntimeException("Betting is closed for this round");
        }

        // Validate round id matches
        if (!round.getId().equals(request.getRoundId())) {
            throw new RuntimeException("Round has changed, please refresh");
        }

        // Validate balance
        if (user.getBalance().compareTo(request.getAmount()) < 0) {
            throw new RuntimeException("Insufficient balance");
        }

        // Validate bet type
        String betType = request.getBetType().toUpperCase();
        if (!betType.equals("RED") &&
            !betType.equals("BLACK") &&
            !betType.equals("NUMBER")) {
            throw new RuntimeException("Invalid bet type");
        }

        // Validate number bet
        if (betType.equals("NUMBER")) {
            if (request.getBetValue() == null) {
                throw new RuntimeException("Bet value required for number bets");
            }
            int num = Integer.parseInt(request.getBetValue());
            if (num < 0 || num > 36) {
                throw new RuntimeException("Number must be between 0 and 36");
            }
        }

        // Deduct balance immediately
        user.setBalance(user.getBalance().subtract(request.getAmount()));
        userRepository.save(user);

        // Save bet
        Bet bet = Bet.builder()
                .user(user)
                .round(round)
                .betType(betType)
                .betValue(request.getBetValue())
                .amount(request.getAmount())
                .winAmount(BigDecimal.ZERO)
                .isSettled(false)
                .build();

        Bet saved = betRepository.save(bet);
        log.info("Bet placed: user={} type={} value={} amount={}",
            username, betType, request.getBetValue(), request.getAmount());

        return mapToBetResponse(saved);
    }

    // ── Settle all bets for a round ───────────────────────────────────────────

    @Transactional
    public void settleBets(Long roundId, int resultNumber) {
        List<Bet> unsettledBets =
            betRepository.findByRoundIdAndIsSettledFalse(roundId);

        log.info("Settling {} bets for round {} with result {}",
            unsettledBets.size(), roundId, resultNumber);

        for (Bet bet : unsettledBets) {
            BigDecimal winAmount = calculateWin(bet, resultNumber);

            bet.setWinAmount(winAmount);
            bet.setIsSettled(true);
            betRepository.save(bet);

            // Credit winnings back to user balance
            if (winAmount.compareTo(BigDecimal.ZERO) > 0) {
                User user = bet.getUser();
                user.setBalance(user.getBalance().add(winAmount));
                userRepository.save(user);
                log.info("User {} won {} on bet {}",
                    user.getUsername(), winAmount, bet.getId());
            }
        }
    }

    // ── Calculate win amount ──────────────────────────────────────────────────

    private BigDecimal calculateWin(Bet bet, int resultNumber) {
        return switch (bet.getBetType()) {

            case "NUMBER" -> {
                int betNum = Integer.parseInt(bet.getBetValue());
                // Win = amount × 36 (35:1 payout + stake returned)
                yield betNum == resultNumber
                    ? bet.getAmount().multiply(BigDecimal.valueOf(36))
                    : BigDecimal.ZERO;
            }

            case "RED" -> {
                // Win = amount × 2 (1:1 payout + stake returned)
                yield RED_NUMBERS.contains(resultNumber)
                    ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                    : BigDecimal.ZERO;
            }

            case "BLACK" -> {
                // Black wins if not red and not zero
                boolean isBlack = !RED_NUMBERS.contains(resultNumber)
                                  && resultNumber != 0;
                yield isBlack
                    ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                    : BigDecimal.ZERO;
            }

            default -> BigDecimal.ZERO;
        };
    }

    // ── Get bet history for a player ──────────────────────────────────────────

    public List<BetResponse> getBetHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return betRepository
                .findTop10ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToBetResponse)
                .collect(Collectors.toList());
    }

    // ── Get updated balance after settlement ──────────────────────────────────

    public BigDecimal getUserBalance(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getBalance();
    }

    // ── Map to response ───────────────────────────────────────────────────────

    private BetResponse mapToBetResponse(Bet bet) {
        return BetResponse.builder()
                .id(bet.getId())
                .roundId(bet.getRound().getId())
                .betType(bet.getBetType())
                .betValue(bet.getBetValue())
                .amount(bet.getAmount())
                .winAmount(bet.getWinAmount())
                .isSettled(bet.getIsSettled())
                .createdAt(bet.getCreatedAt())
                .build();
    }
}