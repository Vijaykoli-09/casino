package com.roulette.casino.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService             jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
            message, StompHeaderAccessor.class
        );

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            log.info("[WS] CONNECT received");

            String authHeader = accessor.getFirstNativeHeader("Authorization");
            log.info("[WS] Auth header: {}", authHeader != null ? "present" : "MISSING");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String username = jwtService.extractUsername(token);
                    log.info("[WS] Username from token: {}", username);

                    if (username != null) {
                        UserDetails userDetails =
                            userDetailsService.loadUserByUsername(username);

                        if (jwtService.isTokenValid(token, username)) {
                            UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                                );
                            accessor.setUser(auth);
                            log.info("[WS] ✅ Auth set for user: {}", username);
                        } else {
                            log.warn("[WS] Token invalid for user: {}", username);
                        }
                    }
                } catch (Exception e) {
                    // Log but don't throw — let STOMP handle the error
                    log.error("[WS] Auth error: {}", e.getMessage());
                }
            } else {
                log.warn("[WS] No Authorization header in CONNECT");
            }
        }

        return message;
    }
}