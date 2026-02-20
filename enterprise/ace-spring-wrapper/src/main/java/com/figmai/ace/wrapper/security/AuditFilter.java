package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.Instant;
import java.util.List;

/**
 * Audit logging filter. Emits a JSONL record for every proxied request.
 * Modes: "stdout" (default) logs to stdout; "file" appends to configurable path.
 *
 * Filter order 20 — runs early to capture full request lifecycle.
 */
@Component
@Order(20)
public class AuditFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(AuditFilter.class);

    private final AceWrapperProperties props;

    public AuditFilter(AceWrapperProperties props) {
        this.props = props;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        if (!props.getAudit().isEnabled()) {
            chain.doFilter(req, res);
            return;
        }

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        long start = System.currentTimeMillis();

        try {
            chain.doFilter(req, res);
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            String user = (String) request.getAttribute("ace.user");
            if (user == null) user = "-";
            String tier = "-";
            Object tierObj = request.getAttribute("ace.user.tier");
            if (tierObj != null) tier = tierObj.toString();
            String reqId = request.getHeader("X-Request-Id");
            if (reqId == null || reqId.isBlank()) reqId = "-";
            String ua = request.getHeader("User-Agent");
            if (ua == null) ua = "-";
            String clientIp = resolveClientIp(request);

            String record = String.format(
                "{\"timestamp\":\"%s\",\"requestId\":\"%s\",\"user\":\"%s\",\"tier\":\"%s\"," +
                "\"method\":\"%s\",\"path\":\"%s\",\"status\":%d,\"latencyMs\":%d," +
                "\"clientIp\":\"%s\",\"userAgent\":\"%s\"}",
                Instant.now().toString(),
                escapeJson(reqId),
                escapeJson(user),
                escapeJson(tier),
                escapeJson(request.getMethod()),
                escapeJson(request.getRequestURI()),
                response.getStatus(),
                elapsed,
                escapeJson(clientIp),
                escapeJson(ua)
            );

            emitRecord(record);
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) return "unknown";
        List<String> trustedProxyIps = props.getSecurity().getTrustedProxyIps();
        boolean trustedProxy = trustedProxyIps != null && trustedProxyIps.stream().anyMatch(ip -> ip.equals(remoteAddr));
        if (!trustedProxy) return remoteAddr;
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) return remoteAddr;
        String first = xff.split(",")[0].trim();
        return first.isEmpty() ? remoteAddr : first;
    }

    private void emitRecord(String record) {
        String mode = props.getAudit().getMode();
        if ("file".equalsIgnoreCase(mode)) {
            try (PrintWriter pw = new PrintWriter(new FileWriter(props.getAudit().getLogPath(), true))) {
                pw.println(record);
            } catch (IOException e) {
                log.error("Failed to write audit log: {}", e.getMessage());
                // Fallback to stdout
                System.out.println(record);
            }
        } else {
            System.out.println(record);
        }
    }

    /**
     * Escape a string for safe inclusion in a JSON value.
     * Handles: backslash, double-quote, and ALL control characters U+0000–U+001F
     * (including \n, \r, \t, and less common ones like \b, \f, and raw control chars).
     */
    static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"'  -> sb.append("\\\"");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        // Escape all other control chars as unicode
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
