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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BetService {

    private final BetRepository  betRepository;
    private final UserRepository userRepository;
    private final RoundService   roundService;

    private static final Set<Integer> RED_NUMBERS = Set.of(
        1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
    );

    // Numbers belonging to each table row (roulette layout rows top-to-bottom)
    // ROW1 = 3,6,9,12,15,18,21,24,27,30,33,36
    // ROW2 = 2,5,8,11,14,17,20,23,26,29,32,35
    // ROW3 = 1,4,7,10,13,16,19,22,25,28,31,34
    private static final Set<Integer> ROW1_NUMBERS = Set.of(3,6,9,12,15,18,21,24,27,30,33,36);
    private static final Set<Integer> ROW2_NUMBERS = Set.of(2,5,8,11,14,17,20,23,26,29,32,35);
    private static final Set<Integer> ROW3_NUMBERS = Set.of(1,4,7,10,13,16,19,22,25,28,31,34);

    /**
     * All valid bet types accepted from the frontend.
     * ROW1/ROW2/ROW3 are the "2:1" column buttons on the right side of the table.
     */
    private static final Set<String> VALID_BET_TYPES = Set.of(
        "NUMBER",
        "RED", "BLACK",
        "EVEN", "ODD",
        "RANGE_LOW", "RANGE_HIGH",
        "DOZEN_1", "DOZEN_2", "DOZEN_3",
        "ROW1", "ROW2", "ROW3"     // ← "2:1" column bets — were missing, caused 400 errors
    );

    // ── Place single bet ──────────────────────────────────────────────────────

    @Transactional
    public BetResponse placeBet(PlaceBetRequest request, String username) {
        User  user  = getUser(username);
        Round round = validateRound(request.getRoundId());

        validateBetType(request.getBetType(), request.getBetValue());
        validateBalance(user, request.getAmount());

        user.setBalance(user.getBalance().subtract(request.getAmount()));
        userRepository.save(user);

        Bet saved = betRepository.save(buildBet(user, round, request));
        log.info("Bet placed: user={} type={} value={} amount={}",
            username, request.getBetType(), request.getBetValue(), request.getAmount());

        return mapToBetResponse(saved);
    }

    // ── Place multiple bets (batch) ───────────────────────────────────────────

    @Transactional
    public Map<String, Object> placeBets(
            List<PlaceBetRequest> requests,
            String username) {

        User  user  = getUser(username);
        Round round = null;

        // Validate everything before touching any balance
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (PlaceBetRequest req : requests) {
            if (round == null) round = validateRound(req.getRoundId());
            validateBetType(req.getBetType(), req.getBetValue());
            totalAmount = totalAmount.add(req.getAmount());
        }

        if (user.getBalance().compareTo(totalAmount) < 0) {
            throw new RuntimeException("Insufficient balance for all bets");
        }

        // Deduct total in one shot — no repeated saves inside the loop
        user.setBalance(user.getBalance().subtract(totalAmount));
        userRepository.save(user);

        List<BetResponse> placed = new ArrayList<>();
        for (PlaceBetRequest req : requests) {
            Bet saved = betRepository.save(buildBet(user, round, req));
            placed.add(mapToBetResponse(saved));
        }

        log.info("Batch: user={} bets={} total={}", username, placed.size(), totalAmount);

        return Map.of(
            "success",       true,
            "totalDeducted", totalAmount,
            "newBalance",    user.getBalance(),
            "bets",          placed
        );
    }

    // ── Settle all bets for a round ───────────────────────────────────────────

    @Transactional
    public void settleBets(Long roundId, int resultNumber) {
        List<Bet> unsettled =
            betRepository.findByRoundIdAndIsSettledFalse(roundId);

        log.info("Settling {} bets for round {} result={}",
            unsettled.size(), roundId, resultNumber);

        for (Bet bet : unsettled) {
            BigDecimal win = calculateWin(bet, resultNumber);
            bet.setWinAmount(win);
            bet.setIsSettled(true);
            betRepository.save(bet);

            if (win.compareTo(BigDecimal.ZERO) > 0) {
                User user = bet.getUser();
                user.setBalance(user.getBalance().add(win));
                userRepository.save(user);
                log.info("User {} won {} on {} bet",
                    user.getUsername(), win, bet.getBetType());
            }
        }
    }

    // ── Payout calculation ────────────────────────────────────────────────────

    private BigDecimal calculateWin(Bet bet, int result) {
        return switch (bet.getBetType()) {

            case "NUMBER" -> {
                int num = Integer.parseInt(bet.getBetValue());
                yield num == result
                    ? bet.getAmount().multiply(BigDecimal.valueOf(36))
                    : BigDecimal.ZERO;
            }

            case "RED" -> RED_NUMBERS.contains(result)
                ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                : BigDecimal.ZERO;

            case "BLACK" -> (!RED_NUMBERS.contains(result) && result != 0)
                ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                : BigDecimal.ZERO;

            case "EVEN" -> (result != 0 && result % 2 == 0)
                ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                : BigDecimal.ZERO;

            case "ODD" -> (result % 2 != 0)
                ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                : BigDecimal.ZERO;

            case "RANGE_LOW" -> (result >= 1 && result <= 18)
                ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                : BigDecimal.ZERO;

            case "RANGE_HIGH" -> (result >= 19 && result <= 36)
                ? bet.getAmount().multiply(BigDecimal.valueOf(2))
                : BigDecimal.ZERO;

            case "DOZEN_1" -> (result >= 1 && result <= 12)
                ? bet.getAmount().multiply(BigDecimal.valueOf(3))
                : BigDecimal.ZERO;

            case "DOZEN_2" -> (result >= 13 && result <= 24)
                ? bet.getAmount().multiply(BigDecimal.valueOf(3))
                : BigDecimal.ZERO;

            case "DOZEN_3" -> (result >= 25 && result <= 36)
                ? bet.getAmount().multiply(BigDecimal.valueOf(3))
                : BigDecimal.ZERO;

            // ── Column bets (2:1) — were missing from original code ───────────
            case "ROW1" -> ROW1_NUMBERS.contains(result)
                ? bet.getAmount().multiply(BigDecimal.valueOf(3))
                : BigDecimal.ZERO;

            case "ROW2" -> ROW2_NUMBERS.contains(result)
                ? bet.getAmount().multiply(BigDecimal.valueOf(3))
                : BigDecimal.ZERO;

            case "ROW3" -> ROW3_NUMBERS.contains(result)
                ? bet.getAmount().multiply(BigDecimal.valueOf(3))
                : BigDecimal.ZERO;

            default -> BigDecimal.ZERO;
        };
    }

    // ── Bet history ───────────────────────────────────────────────────────────

    public List<BetResponse> getBetHistory(String username) {
        User user = getUser(username);
        return betRepository
                .findTop10ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToBetResponse)
                .collect(Collectors.toList());
    }

    public BigDecimal getUserBalance(String username) {
        return getUser(username).getBalance();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Round validateRound(Long roundId) {
        Round round = roundService.getCurrentRound();
        if (round.getStatus() != RoundStatus.BETTING_OPEN) {
            throw new RuntimeException("Betting is closed");
        }
        if (!round.getId().equals(roundId)) {
            throw new RuntimeException("Round has changed, please refresh");
        }
        return round;
    }

    private void validateBalance(User user, BigDecimal amount) {
        if (user.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance");
        }
    }

    private void validateBetType(String betType, String betValue) {
        if (!VALID_BET_TYPES.contains(betType.toUpperCase())) {
            throw new RuntimeException("Invalid bet type: " + betType);
        }
        if ("NUMBER".equalsIgnoreCase(betType)) {
            if (betValue == null) {
                throw new RuntimeException("betValue required for NUMBER bet");
            }
            try {
                int num = Integer.parseInt(betValue);
                if (num < 0 || num > 36) {
                    throw new RuntimeException("Number must be 0–36");
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("betValue must be a number 0–36");
            }
        }
    }

    private Bet buildBet(User user, Round round, PlaceBetRequest req) {
        return Bet.builder()
                .user(user)
                .round(round)
                .betType(req.getBetType().toUpperCase())
                .betValue(req.getBetValue())
                .amount(req.getAmount())
                .winAmount(BigDecimal.ZERO)
                .isSettled(false)
                .build();
    }

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