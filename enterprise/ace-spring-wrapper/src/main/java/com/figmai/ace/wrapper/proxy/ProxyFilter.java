package com.figmai.ace.wrapper.proxy;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.Enumeration;
import java.util.Locale;
import java.util.Set;

/**
 * Core reverse-proxy filter. Matches requests against the RouteAllowlist,
 * blocks disallowed routes, and proxies allowed ones to the Node sidecar.
 *
 * Route priority: wrapper-owned endpoints (/actuator/**, /api/auth/**) bypass proxy;
 * everything else is handled via allowlist + proxy.
 *
 * Filter order 50 — runs after security, RBAC, audit, rate-limit filters.
 */
@Component
@Order(50)
public class ProxyFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(ProxyFilter.class);

    /** Headers we never forward upstream. */
    private static final Set<String> HOP_BY_HOP = Set.of(
            "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
            "te", "trailers", "transfer-encoding", "upgrade", "host"
    );

    /** Identity headers stripped from incoming requests (prevent spoofing). */
    private static final Set<String> IDENTITY_HEADERS = Set.of(
            "x-ace-user", "x-ace-groups", "x-ace-role", "x-ace-wrapper-token"
    );

    private final AceWrapperProperties props;
    private final RouteAllowlist allowlist;

    public ProxyFilter(AceWrapperProperties props, RouteAllowlist allowlist) {
        this.props = props;
        this.allowlist = allowlist;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String method = request.getMethod().toUpperCase(Locale.ROOT);
        String rawPath = request.getRequestURI();
        String query = request.getQueryString();
        var normalizedPathOpt = allowlist.normalizePath(rawPath);
        if (normalizedPathOpt.isEmpty()) {
            response.setStatus(404);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Route not allowed.\"}");
            return;
        }
        String path = normalizedPathOpt.get();

        // Wrapper-owned endpoints should not be proxied to Node.
        if (path.equals("/actuator") || path.startsWith("/actuator/")) {
            chain.doFilter(req, res);
            return;
        }
        if (path.equals("/api/auth") || path.startsWith("/api/auth/")) {
            chain.doFilter(req, res);
            return;
        }

        // --- Allowlist check ---
        var tier = allowlist.match(method, path);
        if (tier.isEmpty()) {
            response.setStatus(404);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Route not allowed.\"}");
            return;
        }

        // Store matched tier
        request.setAttribute("ace.route.tier", tier.get());

        // --- RBAC enforcement (when auth is enabled) ---
        if (props.getSecurity().isEnableAuth() && tier.get() != RouteAllowlist.Tier.PUBLIC) {
            RouteAllowlist.Tier userTier = (RouteAllowlist.Tier) request.getAttribute("ace.user.tier");
            if (userTier == null || userTier.ordinal() < tier.get().ordinal()) {
                response.setStatus(403);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Insufficient privileges for this route.\"}");
                return;
            }
        }

        // --- Build upstream URL ---
        String upstream = props.getProxy().getNodeBaseUrl() + path;
        if (query != null && !query.isEmpty()) {
            upstream += "?" + query;
        }

        proxy(request, response, method, upstream);
    }

    private void proxy(HttpServletRequest request, HttpServletResponse response,
                       String method, String upstream) throws IOException {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) URI.create(upstream).toURL().openConnection();
            conn.setRequestMethod(method);
            conn.setConnectTimeout(props.getProxy().getConnectTimeoutMs());
            conn.setReadTimeout(props.getProxy().getReadTimeoutMs());
            conn.setInstanceFollowRedirects(false);

            // Forward headers (strip hop-by-hop and identity headers)
            copyRequestHeaders(request, conn);

            // Inject identity headers if auth is enabled
            String aceUser = (String) request.getAttribute("ace.user");
            String aceGroups = (String) request.getAttribute("ace.groups");
            String aceRole = (String) request.getAttribute("ace.user.role");
            String userHeader = props.getSecurity().getUserHeaderName();
            String groupsHeader = props.getSecurity().getGroupsHeaderName();
            String roleHeader = props.getSecurity().getRoleHeaderName();
            String wrapperToken = props.getProxy().getWrapperToken();

            if (wrapperToken == null || wrapperToken.isBlank()) {
                response.setStatus(500);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Wrapper misconfigured: missing ace.proxy.wrapper-token.\"}");
                return;
            }
            conn.setRequestProperty("X-ACE-Wrapper-Token", wrapperToken);
            if (aceUser != null && !aceUser.isBlank()) conn.setRequestProperty(userHeader, aceUser);
            if (aceRole != null && !aceRole.isBlank()) conn.setRequestProperty(roleHeader, aceRole);
            if (aceGroups != null && !aceGroups.isBlank()) conn.setRequestProperty(groupsHeader, aceGroups);

            // Forward body for non-GET/HEAD
            boolean hasBody = !"GET".equals(method) && !"HEAD".equals(method);
            if (hasBody) {
                conn.setDoOutput(true);
                // Enforce payload size limit
                int maxBytes = props.getProxy().getMaxRequestBytes();
                try (InputStream in = request.getInputStream();
                     OutputStream out = conn.getOutputStream()) {
                    copyStream(in, out, maxBytes);
                }
            }

            // --- Response ---
            int status = conn.getResponseCode();
            response.setStatus(status);

            // Copy response headers
            for (var headerEntry : conn.getHeaderFields().entrySet()) {
                String name = headerEntry.getKey();
                if (name == null) continue; // status line
                String lower = name.toLowerCase(Locale.ROOT);
                if (HOP_BY_HOP.contains(lower)) continue;
                for (String value : headerEntry.getValue()) {
                    response.addHeader(name, value);
                }
            }

            // Copy response body
            InputStream respStream = (status >= 400) ? conn.getErrorStream() : conn.getInputStream();
            if (respStream != null) {
                try (InputStream in = respStream;
                     OutputStream out = response.getOutputStream()) {
                    in.transferTo(out);
                }
            }

        } catch (IOException e) {
            log.error("Proxy error for {}: {}", upstream, e.getMessage());
            if (!response.isCommitted()) {
                response.setStatus(502);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Upstream unavailable.\"}");
            }
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void copyRequestHeaders(HttpServletRequest request, HttpURLConnection conn) {
        Enumeration<String> names = request.getHeaderNames();
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            String lower = name.toLowerCase(Locale.ROOT);
            if (HOP_BY_HOP.contains(lower)) continue;
            if (IDENTITY_HEADERS.contains(lower)) continue;
            if (lower.equals(props.getSecurity().getUserHeaderName().toLowerCase(Locale.ROOT))) continue;
            if (lower.equals(props.getSecurity().getGroupsHeaderName().toLowerCase(Locale.ROOT))) continue;
            if (lower.equals(props.getSecurity().getRoleHeaderName().toLowerCase(Locale.ROOT))) continue;
            Enumeration<String> values = request.getHeaders(name);
            while (values.hasMoreElements()) {
                conn.addRequestProperty(name, values.nextElement());
            }
        }
    }

    private void copyStream(InputStream in, OutputStream out, int maxBytes) throws IOException {
        byte[] buf = new byte[8192];
        int total = 0;
        int n;
        while ((n = in.read(buf)) != -1) {
            total += n;
            if (total > maxBytes) {
                throw new IOException("Request body exceeds maximum allowed size (" + maxBytes + " bytes).");
            }
            out.write(buf, 0, n);
        }
    }
}
