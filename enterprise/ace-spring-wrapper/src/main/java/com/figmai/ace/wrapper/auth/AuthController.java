package com.figmai.ace.wrapper.auth;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Wrapper-mode auth endpoints. Replaces Node's /api/auth/* when Spring owns auth.
 *
 * Contract (must match what admin-editor/public/app.js expects):
 *   GET  /api/auth/me               -> { user: { id, username, email, role }, allowedTabs: [...] }
 *   GET  /api/auth/bootstrap-allowed -> { allowed: false, reason: "..." }
 *   POST /api/auth/login             -> 403 (disabled in wrapper mode)
 *   POST /api/auth/logout            -> 403 (disabled in wrapper mode)
 *   POST /api/auth/bootstrap         -> 403 (disabled in wrapper mode)
 *
 * Tab IDs must match DOM data-tab attributes in index.html:
 *   config, ai, assistants, knowledge-bases, content-models, registries, analytics, users
 */
@RestController
public class AuthController {

    private static final Map<String, Object> WRAPPER_MODE_BLOCKED = Map.of(
            "error", "Auth endpoints disabled in wrapper mode. Authentication is handled by the Spring wrapper."
    );

    private final AceWrapperProperties props;

    public AuthController(AceWrapperProperties props) {
        this.props = props;
    }

    @GetMapping("/api/auth/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        if (!props.getSecurity().isEnableAuth()) {
            return ResponseEntity.ok(buildMeResponse("dev-user@example.com", "admin"));
        }

        String user = (String) request.getAttribute("ace.user");
        String normalizedRole = normalizeRole((String) request.getAttribute("ace.user.role"));
        if (user == null || user.isBlank() || normalizedRole.isBlank()) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Authentication required."
            ));
        }

        return ResponseEntity.ok(buildMeResponse(user, normalizedRole));
    }

    @GetMapping("/api/auth/bootstrap-allowed")
    public Map<String, Object> bootstrapAllowed() {
        return Map.of(
                "allowed", false,
                "reason", "Authentication is handled by the Spring wrapper."
        );
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<?> login() {
        return ResponseEntity.status(403).body(WRAPPER_MODE_BLOCKED);
    }

    @PostMapping("/api/auth/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.status(403).body(WRAPPER_MODE_BLOCKED);
    }

    @PostMapping("/api/auth/bootstrap")
    public ResponseEntity<?> bootstrap() {
        return ResponseEntity.status(403).body(WRAPPER_MODE_BLOCKED);
    }

    Map<String, Object> buildMeResponse(String username, String role) {
        String normalizedRole = normalizeRole(role);
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", username);
        user.put("username", username);
        user.put("email", username);
        user.put("role", normalizedRole);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("user", user);
        response.put("allowedTabs", allowedTabsForRole(normalizedRole));
        return response;
    }

    static String normalizeRole(String role) {
        if (role == null) return "";
        String normalized = role.trim().toLowerCase();
        return Set.of("admin", "manager", "editor", "reviewer").contains(normalized) ? normalized : "";
    }

    static List<String> allowedTabsForRole(String role) {
        return switch (role) {
            case "admin" -> List.of("config", "ai", "assistants", "knowledge-bases", "content-models", "registries", "analytics", "users");
            case "manager", "editor" -> List.of("config", "ai", "assistants", "knowledge-bases", "content-models", "registries", "analytics");
            default -> List.of("config", "ai");
        };
    }
}
