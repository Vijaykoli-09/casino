package com.roulette.casino.service;

import com.roulette.casino.dto.response.RoundResponse;
import com.roulette.casino.model.Round;
import com.roulette.casino.model.RoundStatus;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.RoundRepository;
import com.roulette.casino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoundService {

    private final RoundRepository roundRepository;
    private final UserRepository  userRepository;

    // ── Durations ─────────────────────────────────────────────────────────────
    public static final int BETTING_OPEN_DURATION    = 45;
    public static final int SPINNING_DURATION        = 10;
    public static final int RESULT_DISPLAY_DURATION  = 5;

    // ── Get current round response (with user balance) ────────────────────────
    public RoundResponse getCurrentRoundResponse(String username) {
        Round round = getCurrentRound();
        User  user  = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return RoundResponse.builder()
                .id(round.getId())
                .status(round.getStatus().name())
                .secondsLeft(calculateSecondsLeft(round))
                .resultNumber(round.getResultNumber())
                .lastResults(getLast10Results())
                .balance(user.getBalance())
                .build();
    }

    // ── Get current round response (no user — for WebSocket broadcast) ────────
    public RoundResponse getCurrentRoundResponsePublic() {
        Round round = getCurrentRound();

        return RoundResponse.builder()
                .id(round.getId())
                .status(round.getStatus().name())
                .secondsLeft(calculateSecondsLeft(round))
                .resultNumber(round.getResultNumber())
                .lastResults(getLast10Results())
                .balance(null)
                .build();
    }

    // ── Get current active round ──────────────────────────────────────────────
    public Round getCurrentRound() {
        return roundRepository.findTopByOrderByCreatedAtDesc()
                .orElseGet(this::createNewRound);
    }

    // ── Create new round ──────────────────────────────────────────────────────
    @Transactional
    public Round createNewRound() {
        Round round = Round.builder()
                .status(RoundStatus.BETTING_OPEN)
                .startTime(LocalDateTime.now())
                .build();
        return roundRepository.save(round);
    }

    // ── Calculate seconds left in current phase ───────────────────────────────
    public int calculateSecondsLeft(Round round) {
        long elapsed = ChronoUnit.SECONDS.between(
            round.getStartTime(),
            LocalDateTime.now()
        );
        int duration = getDurationForStatus(round.getStatus());
        return (int) Math.max(0, duration - elapsed);
    }

    // ── Duration per status ───────────────────────────────────────────────────
    public int getDurationForStatus(RoundStatus status) {
        return switch (status) {
            case BETTING_OPEN   -> BETTING_OPEN_DURATION;
            case SPINNING       -> SPINNING_DURATION;
            case RESULT_DISPLAY -> RESULT_DISPLAY_DURATION;
        };
    }

    // ── Last 10 results ───────────────────────────────────────────────────────
    public List<Integer> getLast10Results() {
        return roundRepository.findLast10Results(PageRequest.of(0, 10));
    }

    // ── Update round status ───────────────────────────────────────────────────
    @Transactional
    public Round updateRoundStatus(Round round, RoundStatus newStatus) {
        round.setStatus(newStatus);
        round.setStartTime(LocalDateTime.now());
        if (newStatus == RoundStatus.RESULT_DISPLAY) {
            round.setEndTime(LocalDateTime.now());
        }
        return roundRepository.save(round);
    }

    // ── Set result number ─────────────────────────────────────────────────────
    @Transactional
    public Round setResultNumber(Round round, int resultNumber) {
        round.setResultNumber(resultNumber);
        return roundRepository.save(round);
    }
}