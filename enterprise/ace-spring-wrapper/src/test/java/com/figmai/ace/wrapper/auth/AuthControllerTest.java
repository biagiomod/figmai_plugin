package com.figmai.ace.wrapper.auth;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests the wrapper-mode auth contract that admin-editor/public/app.js relies on.
 *
 * Key invariants:
 *   - /api/auth/me returns { user: { id, username, email, role }, allowedTabs: [...] }
 *   - allowedTabs uses DOM tab ids: "knowledge-bases" (not "knowledge")
 *   - /api/auth/login, /logout, /bootstrap return 403 in wrapper mode
 *   - /api/auth/bootstrap-allowed returns { allowed: false }
 */
class AuthControllerTest {

    private AceWrapperProperties props;
    private AuthController controller;

    @BeforeEach
    void setUp() {
        props = new AceWrapperProperties();
        props.getSecurity().setEnableAuth(true);
        props.getSecurity().setDevStubAuth(true);
        controller = new AuthController(props);
    }

    @Test
    void meReturnsUserWithIdField() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setAttribute("ace.user", "alice@example.com");
        req.setAttribute("ace.user.role", "admin");

        ResponseEntity<?> resp = controller.me(req);
        assertEquals(200, resp.getStatusCode().value());

        @SuppressWarnings("unchecked")
        var body = (Map<String, Object>) resp.getBody();
        assertNotNull(body);
        @SuppressWarnings("unchecked")
        var user = (Map<String, Object>) body.get("user");
        assertNotNull(user);
        assertEquals("alice@example.com", user.get("id"));
        assertEquals("alice@example.com", user.get("username"));
        assertEquals("alice@example.com", user.get("email"));
        assertEquals("admin", user.get("role"));
    }

    @Test
    void meReturns401WhenNoUser() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        ResponseEntity<?> resp = controller.me(req);
        assertEquals(401, resp.getStatusCode().value());
    }

    @Test
    void adminTabsIncludeKnowledgeBasesNotKnowledge() {
        List<String> tabs = AuthController.allowedTabsForRole("admin");
        assertTrue(tabs.contains("knowledge-bases"), "admin tabs must include 'knowledge-bases'");
        assertFalse(tabs.contains("knowledge"), "admin tabs must NOT include bare 'knowledge'");
        assertTrue(tabs.contains("users"), "admin tabs must include 'users'");
    }

    @Test
    void editorTabsIncludeKnowledgeBases() {
        List<String> tabs = AuthController.allowedTabsForRole("editor");
        assertTrue(tabs.contains("knowledge-bases"));
        assertFalse(tabs.contains("users"));
    }

    @Test
    void reviewerTabsMinimal() {
        List<String> tabs = AuthController.allowedTabsForRole("reviewer");
        assertEquals(List.of("config", "ai"), tabs);
    }

    @Test
    void allowedTabsMatchDomTabIds() {
        List<String> domTabIds = List.of(
                "config", "ai", "assistants", "knowledge-bases",
                "content-models", "registries", "analytics", "users"
        );
        List<String> adminTabs = AuthController.allowedTabsForRole("admin");
        assertEquals(domTabIds, adminTabs, "Admin tabs must match DOM data-tab attribute order");
    }

    @Test
    void bootstrapAllowedReturnsFalse() {
        var body = controller.bootstrapAllowed();
        assertEquals(false, body.get("allowed"));
        assertNotNull(body.get("reason"));
    }

    @Test
    void loginReturns403() {
        ResponseEntity<?> resp = controller.login();
        assertEquals(403, resp.getStatusCode().value());
    }

    @Test
    void logoutReturns403() {
        ResponseEntity<?> resp = controller.logout();
        assertEquals(403, resp.getStatusCode().value());
    }

    @Test
    void bootstrapPostReturns403() {
        ResponseEntity<?> resp = controller.bootstrap();
        assertEquals(403, resp.getStatusCode().value());
    }

    @Test
    void devModeReturnsHardcodedAdmin() {
        props.getSecurity().setEnableAuth(false);
        MockHttpServletRequest req = new MockHttpServletRequest();
        ResponseEntity<?> resp = controller.me(req);
        assertEquals(200, resp.getStatusCode().value());

        @SuppressWarnings("unchecked")
        var body = (Map<String, Object>) resp.getBody();
        @SuppressWarnings("unchecked")
        var user = (Map<String, Object>) body.get("user");
        assertEquals("dev-user@example.com", user.get("username"));
        assertEquals("admin", user.get("role"));
        assertNotNull(user.get("id"));
    }

    @Test
    void normalizeRoleHandlesEdgeCases() {
        assertEquals("admin", AuthController.normalizeRole("Admin"));
        assertEquals("admin", AuthController.normalizeRole("  ADMIN  "));
        assertEquals("reviewer", AuthController.normalizeRole("reviewer"));
        assertEquals("", AuthController.normalizeRole(null));
        assertEquals("", AuthController.normalizeRole("unknown"));
        assertEquals("", AuthController.normalizeRole(""));
    }
}
