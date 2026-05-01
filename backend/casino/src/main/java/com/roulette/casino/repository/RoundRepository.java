package com.roulette.casino.repository;

import com.roulette.casino.model.Round;
import com.roulette.casino.model.RoundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoundRepository extends JpaRepository<Round, Long> {

    // Get the currently active round
    Optional<Round> findTopByStatusOrderByCreatedAtDesc(RoundStatus status);

    // Get latest round regardless of status
    Optional<Round> findTopByOrderByCreatedAtDesc();

    // Last 10 results for the results strip
    @Query("SELECT r.resultNumber FROM Round r " +
           "WHERE r.resultNumber IS NOT NULL " +
           "ORDER BY r.createdAt DESC")
    List<Integer> findLast10Results(org.springframework.data.domain.Pageable pageable);
}