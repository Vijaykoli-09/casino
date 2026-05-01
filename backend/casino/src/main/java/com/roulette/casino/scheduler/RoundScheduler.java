package com.roulette.casino.scheduler;

import com.roulette.casino.dto.response.RoundResponse;
import com.roulette.casino.model.Round;
import com.roulette.casino.model.RoundStatus;
import com.roulette.casino.model.User;
import com.roulette.casino.repository.UserRepository;
import com.roulette.casino.service.BetService;
import com.roulette.casino.service.RoundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoundScheduler {

    private final RoundService          roundService;
    private final BetService            betService;
    private final UserRepository        userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final SecureRandom random = new SecureRandom();

    // ── Runs every second ─────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 1000)
    public void processRound() {
        try {
            Round round = roundService.getCurrentRound();
            int secondsLeft = roundService.calculateSecondsLeft(round);

            // Transition if time is up
            if (secondsLeft <= 0) {
                transition(round);
            } else {
                // Broadcast current state to all connected players
                broadcastRoundState(round);
            }
        } catch (Exception e) {
            log.error("Scheduler error: {}", e.getMessage(), e);
        }
    }

    // ── State machine transition ──────────────────────────────────────────────

    private void transition(Round round) {
        switch (round.getStatus()) {

            case BETTING_OPEN -> {
                log.info("Round {} → BETTING_CLOSED", round.getId());
                Round updated = roundService.updateRoundStatus(
                    round, RoundStatus.BETTING_CLOSED
                );
                broadcastRoundState(updated);
            }

            case BETTING_CLOSED -> {
                log.info("Round {} → SPINNING", round.getId());
                Round updated = roundService.updateRoundStatus(
                    round, RoundStatus.SPINNING
                );
                broadcastRoundState(updated);
            }

            case SPINNING -> {
                // Generate result
                int result = random.nextInt(37); // 0 to 36
                log.info("Round {} → RESULT_DISPLAY | result = {}", round.getId(), result);

                // Save result
                Round withResult = roundService.setResultNumber(round, result);

                // Settle all bets
                betService.settleBets(round.getId(), result);

                // Transition to result display
                Round updated = roundService.updateRoundStatus(
                    withResult, RoundStatus.RESULT_DISPLAY
                );

                // Broadcast result to all
                broadcastRoundState(updated);

                // Push updated balance to each player
                pushBalancesToPlayers();
            }

            case RESULT_DISPLAY -> {
                // Create new round — cycle repeats
                log.info("Round {} complete → Starting new round", round.getId());
                Round newRound = roundService.createNewRound();
                broadcastRoundState(newRound);
            }
        }
    }

    // ── Broadcast round state to all subscribers ──────────────────────────────

    private void broadcastRoundState(Round round) {
        RoundResponse response = roundService.getCurrentRoundResponsePublic();
        messagingTemplate.convertAndSend("/topic/round", response);
    }

    // ── Push updated balance to each individual player ────────────────────────

    private void pushBalancesToPlayers() {
        List<User> players = userRepository.findByRole(
            com.roulette.casino.model.Role.PLAYER
        );

        for (User player : players) {
            Map<String, Object> balanceUpdate = new HashMap<>();
            balanceUpdate.put("balance", player.getBalance());
            balanceUpdate.put("username", player.getUsername());

            messagingTemplate.convertAndSendToUser(
                player.getUsername(),
                "/queue/balance",
                balanceUpdate
            );
        }
    }
}