package com.roulette.casino.scheduler;

import com.roulette.casino.model.Round;
import com.roulette.casino.model.RoundStatus;
import com.roulette.casino.model.Role;
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
            Round round       = roundService.getCurrentRound();
            int   secondsLeft = roundService.calculateSecondsLeft(round);

            if (secondsLeft <= 0) {
                transition(round);
            } else {
                broadcastRoundState();
            }
        } catch (Exception e) {
            log.error("Scheduler error: {}", e.getMessage(), e);
        }
    }

    // ── State machine ─────────────────────────────────────────────────────────
    private void transition(Round round) {
        switch (round.getStatus()) {

            case BETTING_OPEN -> {
                // BETTING_OPEN → SPINNING directly
                log.info("Round {} → SPINNING", round.getId());
                Round updated = roundService.updateRoundStatus(
                    round, RoundStatus.SPINNING
                );
                broadcastRoundState();
            }

            case SPINNING -> {
                // Generate result
                int result = random.nextInt(37);
                log.info("Round {} → RESULT_DISPLAY | result = {}",
                    round.getId(), result);

                // Save result number
                Round withResult = roundService.setResultNumber(round, result);

                // Settle all bets
                betService.settleBets(round.getId(), result);

                // Transition to result display
                roundService.updateRoundStatus(
                    withResult, RoundStatus.RESULT_DISPLAY
                );

                broadcastRoundState();

                // Push updated balance to every player
                pushBalancesToPlayers();
            }

            case RESULT_DISPLAY -> {
                // Start new round
                log.info("Round {} complete → New round starting", round.getId());
                roundService.createNewRound();
                broadcastRoundState();
            }
        }
    }

    // ── Broadcast to all subscribers ──────────────────────────────────────────
    private void broadcastRoundState() {
        messagingTemplate.convertAndSend(
            "/topic/round",
            roundService.getCurrentRoundResponsePublic()
        );
    }

    // ── Push balance to each player privately ─────────────────────────────────
    private void pushBalancesToPlayers() {
        List<User> players = userRepository.findByRole(Role.PLAYER);
        for (User player : players) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("balance",  player.getBalance());
            payload.put("username", player.getUsername());
            messagingTemplate.convertAndSendToUser(
                player.getUsername(),
                "/queue/balance",
                payload
            );
        }
    }
}