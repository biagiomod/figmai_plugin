package com.figmai.ace.wrapper.proxy;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Compiles the proxy allowlist from configuration into a fast lookup.
 * Each entry is "METHOD /path/pattern" (e.g. "GET /api/kb/**").
 * Tiers: public, read, write, admin.
 * Returns the highest-privilege tier that matches, or empty if blocked.
 */
@Component
public class RouteAllowlist {

    /** Tiers in ascending privilege order. */
    public enum Tier { PUBLIC, READ, WRITE, ADMIN }

    private final AceWrapperProperties props;
    private final AntPathMatcher matcher = new AntPathMatcher();

    /** Compiled entries: tier -> list of (method, antPattern). */
    private final Map<Tier, List<Entry>> compiled = new EnumMap<>(Tier.class);

    public RouteAllowlist(AceWrapperProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void init() {
        Map<String, List<String>> raw = props.getProxy().getAllowlist();
        if (raw == null) raw = Map.of();
        for (Tier tier : Tier.values()) {
            compiled.put(tier, new ArrayList<>());
        }
        for (var entry : raw.entrySet()) {
            Tier tier = parseTier(entry.getKey());
            if (tier == null) continue;
            for (String pattern : entry.getValue()) {
                Entry parsed = parseEntry(pattern);
                if (parsed != null) compiled.get(tier).add(parsed);
            }
        }
    }

    /**
     * Match an incoming request against the allowlist.
     * @return the tier if allowed, or empty if blocked.
     */
    public Optional<Tier> match(String method, String path) {
        if (method == null || path == null) return Optional.empty();
        String upperMethod = method.toUpperCase(Locale.ROOT);
        Optional<String> normalized = normalizePath(path);
        if (normalized.isEmpty()) return Optional.empty();
        String normalizedPath = normalized.get();
        // Check tiers from most to least restrictive.
        for (Tier tier : List.of(Tier.ADMIN, Tier.WRITE, Tier.READ, Tier.PUBLIC)) {
            for (Entry entry : compiled.get(tier)) {
                if (entry.method.equals("*") || entry.method.equals(upperMethod)) {
                    if (matcher.match(entry.pattern, normalizedPath)) {
                        return Optional.of(tier);
                    }
                }
            }
        }
        return Optional.empty();
    }

    /** Expose compiled entries for testing. */
    public Map<Tier, List<Entry>> getCompiled() {
        return Collections.unmodifiableMap(compiled);
    }

    // --- Internal ---

    private static Tier parseTier(String name) {
        return switch (name.toLowerCase(Locale.ROOT)) {
            case "public" -> Tier.PUBLIC;
            case "read" -> Tier.READ;
            case "write" -> Tier.WRITE;
            case "admin" -> Tier.ADMIN;
            default -> null;
        };
    }

    private static Entry parseEntry(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.trim();
        int space = trimmed.indexOf(' ');
        if (space <= 0) return null;
        String method = trimmed.substring(0, space).toUpperCase(Locale.ROOT);
        String pattern = trimmed.substring(space + 1).trim();
        if (pattern.isEmpty()) return null;
        return new Entry(method, pattern);
    }

    /**
     * Normalize a request path with iterative decoding (max 2 passes) and strict
     * traversal rejection. Returns empty if the path is malicious.
     *
     * Strategy:
     *   1. Iteratively URL-decode up to MAX_DECODE_PASSES times.
     *   2. After EACH pass, reject if dangerous encoded sequences remain
     *      (%2e, %2f, %5c, or their double-encoded forms %25xx).
     *   3. After full decoding, reject if any segment is "." or "..".
     *   4. Reject backslashes and null bytes.
     *   5. Collapse multiple slashes, ensure leading slash.
     */
    Optional<String> normalizePath(String input) {
        if (input == null || input.isBlank()) return Optional.of("/");
        String current = input.trim();

        // Iterative decode with a strict cap to catch double/triple encoding.
        for (int pass = 0; pass < MAX_DECODE_PASSES; pass++) {
            // Before decoding: reject if dangerous percent-encoded sequences are present.
            if (containsEncodedTraversal(current)) return Optional.empty();
            String decoded;
            try {
                decoded = URLDecoder.decode(current, StandardCharsets.UTF_8);
            } catch (IllegalArgumentException e) {
                return Optional.empty();
            }
            if (decoded.equals(current)) break; // No more decoding possible
            current = decoded;
        }

        // Final check after all decoding
        if (containsEncodedTraversal(current)) return Optional.empty();
        if (current.contains("\\") || current.contains("\u0000")) return Optional.empty();

        // Collapse slashes, ensure leading /
        String collapsed = current.replaceAll("/+", "/");
        if (!collapsed.startsWith("/")) {
            collapsed = "/" + collapsed;
        }

        // Segment-level traversal check
        String[] parts = collapsed.split("/");
        Deque<String> normalized = new ArrayDeque<>();
        for (String part : parts) {
            if (part.isBlank() || ".".equals(part)) continue;
            if ("..".equals(part)) return Optional.empty();
            normalized.addLast(part);
        }

        StringBuilder out = new StringBuilder("/");
        Iterator<String> it = normalized.iterator();
        while (it.hasNext()) {
            out.append(it.next());
            if (it.hasNext()) out.append('/');
        }
        return Optional.of(out.toString());
    }

    /** Max iterations for URL decode to catch double/triple encoding. */
    private static final int MAX_DECODE_PASSES = 2;

    /**
     * Check if the string contains percent-encoded traversal sequences.
     * Catches: %2e, %2f, %5c (any case), and their double-encoded forms
     * (%252e, %252f, %255c) that could re-materialize on further decoding.
     */
    private static boolean containsEncodedTraversal(String s) {
        String lower = s.toLowerCase(Locale.ROOT);
        // Direct encoded traversal chars
        if (lower.contains("%2e") || lower.contains("%2f") || lower.contains("%5c")) return true;
        // Double-encoded forms (e.g. %252e decodes to %2e which decodes to .)
        if (lower.contains("%25")) {
            // Check for %25 followed by 2e, 2f, or 5c
            int idx = 0;
            while ((idx = lower.indexOf("%25", idx)) != -1) {
                if (idx + 4 < lower.length()) {
                    String next2 = lower.substring(idx + 3, idx + 5);
                    if ("2e".equals(next2) || "2f".equals(next2) || "5c".equals(next2)) {
                        return true;
                    }
                }
                idx += 3;
            }
        }
        return false;
    }

    public record Entry(String method, String pattern) {}
}
