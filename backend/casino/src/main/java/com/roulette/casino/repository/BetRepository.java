package com.roulette.casino.repository;

import com.roulette.casino.model.Bet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface BetRepository extends JpaRepository<Bet, Long> {

    // All unsettled bets for a round (for settlement)
    List<Bet> findByRoundIdAndIsSettledFalse(Long roundId);

    // Player's last 10 bets for history screen
    List<Bet> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    // All bets by a player
    List<Bet> findByUserId(Long userId);

    // Total profit for an admin
    // Profit = total bet amount - total win amount for all players under this admin
    @Query("SELECT COALESCE(SUM(b.amount - b.winAmount), 0) FROM Bet b " +
           "WHERE b.user.createdBy.id = :adminId " +
           "AND b.isSettled = true")
    BigDecimal calculateAdminProfit(@Param("adminId") Long adminId);

    // All bets for a specific round and player
    List<Bet> findByRoundIdAndUserId(Long roundId, Long userId);

    // Check if player already bet on this round
    boolean existsByRoundIdAndUserId(Long roundId, Long userId);

    // Profit within date range
@Query("SELECT COALESCE(SUM(b.amount - b.winAmount), 0) FROM Bet b " +
       "WHERE b.user.createdBy.id = :adminId " +
       "AND b.isSettled = true " +
       "AND b.createdAt BETWEEN :from AND :to")
BigDecimal calculateAdminProfitByDateRange(
    @Param("adminId") Long adminId,
    @Param("from") java.time.LocalDateTime from,
    @Param("to") java.time.LocalDateTime to
);

// Total bets amount within date range
@Query("SELECT COALESCE(SUM(b.amount), 0) FROM Bet b " +
       "WHERE b.user.createdBy.id = :adminId " +
       "AND b.isSettled = true " +
       "AND b.createdAt BETWEEN :from AND :to")
BigDecimal calculateTotalBetsByDateRange(
    @Param("adminId") Long adminId,
    @Param("from") java.time.LocalDateTime from,
    @Param("to") java.time.LocalDateTime to
);

// Total payouts within date range
@Query("SELECT COALESCE(SUM(b.winAmount), 0) FROM Bet b " +
       "WHERE b.user.createdBy.id = :adminId " +
       "AND b.isSettled = true " +
       "AND b.createdAt BETWEEN :from AND :to")
BigDecimal calculateTotalPayoutsByDateRange(
    @Param("adminId") Long adminId,
    @Param("from") java.time.LocalDateTime from,
    @Param("to") java.time.LocalDateTime to
);
}