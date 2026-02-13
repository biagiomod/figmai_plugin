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

    @BeforeEach
    void setUp() throws IOException {
        props = new AceWrapperProperties();
        var proxy = new AceWrapperProperties.Proxy();
        proxy.setWrapperToken("test-wrapper-token");
        proxy.setAllowlist(Map.of(
                "public", List.of("GET /api/build-info", "GET /home/**", "GET /home/ace/**"),
                "read", List.of("GET /api/model"),
                "write", List.of("POST /api/save")
        ));
        props.setProxy(proxy);

        upstream = HttpServer.create(new InetSocketAddress(0), 0);
        upstream.createContext("/api/model", this::handleModel);
        upstream.createContext("/api/build-info", this::handleBuildInfo);
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
    void authEndpointBlockedWhenAuthEnabled() throws Exception {
        props.getSecurity().setEnableAuth(true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertEquals(403, res.getStatus());
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

    private void handleModel(HttpExchange exchange) throws IOException {
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
}
