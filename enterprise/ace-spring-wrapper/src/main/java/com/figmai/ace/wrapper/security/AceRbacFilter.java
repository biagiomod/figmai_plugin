package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import com.figmai.ace.wrapper.proxy.RouteAllowlist;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * RBAC gating filter. Runs after auth resolution (order 30) and before proxy (order 50).
 *
 * Canonical role mapping lives in wrapper config:
 * ace.security.group-to-role-map (group -> ace role).
 * Role is derived from groups here, then mapped to route tier and forwarded as X-ACE-Role.
 *
 * Tier hierarchy: PUBLIC < READ < WRITE < ADMIN.
 * If auth is disabled, this filter is a no-op.
 */
@Component
@Order(30)
public class AceRbacFilter implements Filter {

    private final AceWrapperProperties props;

    public AceRbacFilter(AceWrapperProperties props) {
        this.props = props;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        if (!props.getSecurity().isEnableAuth()) {
            chain.doFilter(req, res);
            return;
        }

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        // Resolve user groups from request attribute (set by auth filter)
        String groupsRaw = (String) request.getAttribute("ace.groups");
        Set<String> userGroups = (groupsRaw == null || groupsRaw.isBlank())
                ? Set.of()
                : Arrays.stream(groupsRaw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toSet());

        Optional<String> role = resolveRole(userGroups);
        RouteAllowlist.Tier userTier = tierForRole(role.orElse(null));

        // Store identity on request for ProxyFilter to inject as headers
        String user = (String) request.getAttribute("ace.user");
        if (user == null) user = "anonymous";
        request.setAttribute("ace.user", user);
        request.setAttribute("ace.groups", groupsRaw != null ? groupsRaw : "");
        request.setAttribute("ace.user.role", role.orElse(""));

        // The route tier will be set by ProxyFilter after allowlist check.
        // We need to let the proxy filter run first to determine the tier,
        // then check RBAC. But since ProxyFilter is order 50 and we are order 30,
        // we pass through here and the ProxyFilter handles the actual proxy call.
        // RBAC enforcement happens inside ProxyFilter after tier is determined.
        // Instead, we store user tier for ProxyFilter to consult.
        request.setAttribute("ace.user.tier", userTier);

        chain.doFilter(req, res);
    }

    private Optional<String> resolveRole(Set<String> userGroups) {
        var mapping = props.getSecurity().getGroupToRoleMap();
        String resolved = null;
        for (String g : userGroups) {
            String role = mapping.get(g);
            if (role == null) {
                role = mapping.get(g.toLowerCase());
            }
            if (role == null) continue;
            if ("admin".equalsIgnoreCase(role)) return Optional.of("admin");
            if ("manager".equalsIgnoreCase(role)) resolved = "manager";
            else if ("editor".equalsIgnoreCase(role) && !"manager".equalsIgnoreCase(resolved)) resolved = "editor";
            else if ("reviewer".equalsIgnoreCase(role) && resolved == null) resolved = "reviewer";
        }
        return Optional.ofNullable(resolved);
    }

    private static RouteAllowlist.Tier tierForRole(String role) {
        if ("admin".equalsIgnoreCase(role)) return RouteAllowlist.Tier.ADMIN;
        if ("manager".equalsIgnoreCase(role) || "editor".equalsIgnoreCase(role)) return RouteAllowlist.Tier.WRITE;
        if ("reviewer".equalsIgnoreCase(role)) return RouteAllowlist.Tier.READ;
        return RouteAllowlist.Tier.PUBLIC;
    }
}
