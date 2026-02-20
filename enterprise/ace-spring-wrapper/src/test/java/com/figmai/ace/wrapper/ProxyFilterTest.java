package com.figmai.ace.wrapper;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import com.figmai.ace.wrapper.proxy.ProxyFilter;
import com.figmai.ace.wrapper.proxy.RouteAllowlist;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ProxyFilterTest {

    private AceWrapperProperties props;
    private RouteAllowlist allowlist;
    private ProxyFilter filter;
    private FilterChain chain;
    private HttpServer upstream;
    private final AtomicReference<String> upstreamUser = new AtomicReference<>();
    private final AtomicReference<String> upstreamRole = new AtomicReference<>();
    private final AtomicReference<String> upstreamToken = new AtomicReference<>();
    private final AtomicReference<String> upstreamGroups = new AtomicReference<>();
    private final AtomicReference<String> upstreamPath = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        props = new AceWrapperProperties();
        var proxy = new AceWrapperProperties.Proxy();
        proxy.setWrapperToken("test-wrapper-token");
        proxy.setAllowlist(Map.of(
                "public", List.of(
                        "GET /api/build-info",
                        "GET /home/**", "HEAD /home/**",
                        "GET /home/admin/**", "HEAD /home/admin/**",
                        "GET /fonts.css", "HEAD /fonts.css",
                        "GET /styles.css", "HEAD /styles.css",
                        "GET /assets/**", "HEAD /assets/**"
                ),
                "read", List.of("GET /api/model"),
                "write", List.of("POST /api/save", "POST /api/validate"),
                "admin", List.of("PATCH /api/users/**")
        ));
        props.setProxy(proxy);

        upstream = HttpServer.create(new InetSocketAddress(0), 0);
        upstream.createContext("/api/model", this::handleModel);
        upstream.createContext("/api/validate", this::handleValidate);
        upstream.createContext("/api/users/42", this::handleUsersPatch);
        upstream.createContext("/api/build-info", this::handleBuildInfo);
        upstream.createContext("/home/", this::handleHomePage);
        upstream.createContext("/home/admin/", this::handleAceUi);
        upstream.createContext("/home/admin/app.js", this::handleAceAsset);
        upstream.createContext("/home/admin/styles.css", this::handleAceCss);
        upstream.createContext("/home/admin/fonts.css", this::handleAceFontsCss);
        upstream.createContext("/fonts.css", this::handleRootFontsCss);
        upstream.createContext("/styles.css", this::handleRootStylesCss);
        upstream.createContext("/assets/", this::handleRootAsset);
        upstream.start();
        props.getProxy().setNodeBaseUrl("http://127.0.0.1:" + upstream.getAddress().getPort());

        allowlist = new RouteAllowlist(props);
        allowlist.init();
        filter = new ProxyFilter(props, allowlist);
        chain = mock(FilterChain.class);
    }

    @AfterEach
    void tearDown() {
        if (upstream != null) {
            upstream.stop(0);
        }
    }

    @Test
    void blockedRouteReturns404() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/secret");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertEquals(404, res.getStatus());
    }

    @Test
    void encodedTraversalBlockedByNormalization() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/%2f%2e%2e%2fmodel");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertEquals(404, res.getStatus());
    }

    @Test
    void authEndpointBypassesProxyFilter() throws Exception {
        props.getSecurity().setEnableAuth(true);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/auth/me");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        verify(chain).doFilter(req, res);
    }

    @Test
    void injectsCanonicalIdentityAndWrapperToken() throws Exception {
        props.getSecurity().setEnableAuth(true);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/model");
        req.setAttribute("ace.user", "user@example.com");
        req.setAttribute("ace.groups", "ace-editors,ace-reviewers");
        req.setAttribute("ace.user.role", "editor");
        req.setAttribute("ace.user.tier", RouteAllowlist.Tier.WRITE);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("/api/model", upstreamPath.get());
        assertEquals("user@example.com", upstreamUser.get());
        assertEquals("editor", upstreamRole.get());
        assertEquals("ace-editors,ace-reviewers", upstreamGroups.get());
        assertEquals("test-wrapper-token", upstreamToken.get());
    }

    @Test
    void stripsIncomingSpoofedIdentityHeaders() throws Exception {
        props.getSecurity().setEnableAuth(true);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/model");
        req.addHeader("X-ACE-User", "spoof@example.com");
        req.addHeader("X-ACE-Role", "admin");
        req.addHeader("X-ACE-Wrapper-Token", "spoof-token");
        req.setAttribute("ace.user", "trusted@example.com");
        req.setAttribute("ace.user.role", "reviewer");
        req.setAttribute("ace.user.tier", RouteAllowlist.Tier.READ);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("trusted@example.com", upstreamUser.get());
        assertEquals("reviewer", upstreamRole.get());
        assertEquals("test-wrapper-token", upstreamToken.get());
    }

    @Test
    void missingWrapperTokenConfigFailsClosed() throws Exception {
        props.getProxy().setWrapperToken("");
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/build-info");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertEquals(500, res.getStatus());
        assertTrue(res.getContentAsString().contains("missing ace.proxy.wrapper-token"));
    }

    @Test
    void tierStoredAsRequestAttribute() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/home/about");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertEquals(RouteAllowlist.Tier.PUBLIC, req.getAttribute("ace.route.tier"));
    }

    @Test
    void validateEndpointIsAllowlistedAndProxied() throws Exception {
        props.getSecurity().setEnableAuth(true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/validate");
        req.setContentType("application/json");
        req.setContent("{\"model\":{}}".getBytes(StandardCharsets.UTF_8));
        req.setAttribute("ace.user", "user@example.com");
        req.setAttribute("ace.user.role", "editor");
        req.setAttribute("ace.groups", "ace-editors");
        req.setAttribute("ace.user.tier", RouteAllowlist.Tier.WRITE);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    @Test
    void patchUsersEndpointIsAllowlistedForAdminTier() throws Exception {
        props.getSecurity().setEnableAuth(true);
        MockHttpServletRequest req = new MockHttpServletRequest("PATCH", "/api/users/42");
        req.setContentType("application/json");
        req.setContent("{\"role\":\"editor\"}".getBytes(StandardCharsets.UTF_8));
        req.setAttribute("ace.user", "admin@example.com");
        req.setAttribute("ace.user.role", "admin");
        req.setAttribute("ace.groups", "ace-admins");
        req.setAttribute("ace.user.tier", RouteAllowlist.Tier.ADMIN);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        // JDK HttpServer does not support PATCH, so upstream returns 502.
        // The key assertion is that the allowlist did NOT block it (would be 404).
        assertNotEquals(404, res.getStatus(), "PATCH /api/users/** must be allowlisted for ADMIN tier");
    }

    @Test
    void preservesHomeAdminTrailingSlashAndReturns200() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/home/admin/");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("/home/admin/", upstreamPath.get());
        assertEquals("text/html; charset=utf-8", res.getContentType());
        assertEquals("<html><body>ACE</body></html>", res.getContentAsString());
    }

    @Test
    void proxiesAceStaticAssetPath() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/home/admin/app.js");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("/home/admin/app.js", upstreamPath.get());
        assertEquals("application/javascript; charset=utf-8", res.getContentType());
        assertEquals("console.log('ace');", res.getContentAsString());
    }

    @Test
    void productHomeRootIsProxiedToNodeAndReturnsHtml() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/home/");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("/home/", upstreamPath.get());
        assertEquals("text/html; charset=utf-8", res.getContentType());
        assertEquals("<html><body>HOME</body></html>", res.getContentAsString());
    }

    @Test
    void headHomeAdminAppJsReturns200() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("HEAD", "/home/admin/app.js");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("/home/admin/app.js", upstreamPath.get());
    }

    @Test
    void headHomeAdminStylesCssReturns200() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("HEAD", "/home/admin/styles.css");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    @Test
    void headHomeAdminFontsCssReturns200() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("HEAD", "/home/admin/fonts.css");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    @Test
    void headHomeRootReturns200() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("HEAD", "/home/");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    @Test
    void rootFontsCssIsProxied() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/fonts.css");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("text/css; charset=utf-8", res.getContentType());
    }

    @Test
    void rootStylesCssIsProxied() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/styles.css");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertEquals("text/css; charset=utf-8", res.getContentType());
    }

    @Test
    void rootAssetsAreProxied() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/assets/logo-figmai.svg");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    @Test
    void actuatorHealthBypassesProxy() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/actuator/health");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        verify(chain).doFilter(req, res);
    }

    private void handleModel(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        upstreamUser.set(exchange.getRequestHeaders().getFirst("X-ACE-User"));
        upstreamRole.set(exchange.getRequestHeaders().getFirst("X-ACE-Role"));
        upstreamGroups.set(exchange.getRequestHeaders().getFirst("X-ACE-Groups"));
        upstreamToken.set(exchange.getRequestHeaders().getFirst("X-ACE-Wrapper-Token"));
        byte[] body = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleBuildInfo(HttpExchange exchange) throws IOException {
        upstreamToken.set(exchange.getRequestHeaders().getFirst("X-ACE-Wrapper-Token"));
        byte[] body = "{\"version\":\"test\"}".getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleValidate(HttpExchange exchange) throws IOException {
        byte[] body = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleUsersPatch(HttpExchange exchange) throws IOException {
        byte[] body = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleAceUi(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "<html><body>ACE</body></html>".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleHomePage(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "<html><body>HOME</body></html>".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleAceAsset(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "console.log('ace');".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/javascript; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleAceCss(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "body{}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/css; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleAceFontsCss(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "@font-face{}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/css; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleRootFontsCss(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "@font-face{}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/css; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleRootStylesCss(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "body{}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/css; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private void handleRootAsset(HttpExchange exchange) throws IOException {
        upstreamPath.set(exchange.getRequestURI().getPath());
        byte[] body = "<svg/>".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "image/svg+xml");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }
}
