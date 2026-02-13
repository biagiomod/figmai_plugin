package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Basic token-bucket rate limiter keyed by user first, then client IP.
 * If user identity is present (ace.user request attribute), it is the primary key.
 * Otherwise key is client IP. X-Forwarded-For is trusted only if request
 * originates from a configured trusted proxy IP.
 * Returns 429 when exceeded.
 *
 * This is a minimal in-memory implementation suitable for single-instance
 * deployments. For multi-instance, replace with Redis or a gateway-level limiter.
 *
 * Filter order 25 — runs after audit, before RBAC.
 */
@Component
@Order(25)
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS = 100;
    private static final long WINDOW_MS = 60_000;

    private final AceWrapperProperties props;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(AceWrapperProperties props) {
        this.props = props;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String key = resolveKey(request);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket());

        if (!bucket.tryConsume()) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Rate limit exceeded. Try again later.\"}");
            return;
        }

        chain.doFilter(req, res);
    }

    String resolveKey(HttpServletRequest request) {
        String user = (String) request.getAttribute("ace.user");
        if (user != null && !user.isBlank() && !"anonymous".equalsIgnoreCase(user)) {
            return "user:" + user;
        }
        return "ip:" + resolveClientIp(request);
    }

    String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return "unknown";
        }
        List<String> trustedProxyIps = props.getSecurity().getTrustedProxyIps();
        boolean trustedProxy = trustedProxyIps != null && trustedProxyIps.stream().anyMatch(ip -> ip.equals(remoteAddr));
        if (!trustedProxy) {
            return remoteAddr;
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) {
            return remoteAddr;
        }
        String first = xff.split(",")[0].trim();
        return first.isEmpty() ? remoteAddr : first;
    }

    /**
     * Simple sliding window bucket.
     */
    private static class Bucket {
        private long windowStart = System.currentTimeMillis();
        private int count = 0;

        synchronized boolean tryConsume() {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW_MS) {
                windowStart = now;
                count = 0;
            }
            if (count >= MAX_REQUESTS) {
                return false;
            }
            count++;
            return true;
        }
    }
}
