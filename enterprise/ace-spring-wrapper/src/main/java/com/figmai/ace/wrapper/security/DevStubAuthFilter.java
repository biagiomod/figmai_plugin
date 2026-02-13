package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Identity resolution filter (order 10 — runs first).
 *
 * Three modes:
 *   1. enableAuth=false: no-op (smoke-test / local dev).
 *   2. enableAuth=true, devStubAuth=true: inject a hardcoded test principal.
 *      ONLY allowed when Spring profile "dev" or "local" is active.
 *      Startup fails if devStubAuth=true and no dev/local profile is active.
 *   3. enableAuth=true, devStubAuth=false (production): read identity from
 *      the Spring Security principal (set by OIDC/SAML/pre-auth upstream).
 *      Does NOT read any HTTP request headers for identity — prevents spoofing.
 *      Returns 401 if no authenticated principal exists.
 */
@Component
@Order(10)
public class DevStubAuthFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(DevStubAuthFilter.class);

    /** Profiles that allow devStubAuth. */
    private static final Set<String> DEV_PROFILES = Set.of("dev", "local", "test");

    private final AceWrapperProperties props;
    private final Environment env;

    public DevStubAuthFilter(AceWrapperProperties props, Environment env) {
        this.props = props;
        this.env = env;
    }

    @PostConstruct
    public void validateConfig() {
        if (props.getSecurity().isDevStubAuth()) {
            Set<String> activeProfiles = Set.of(env.getActiveProfiles());
            boolean hasDev = activeProfiles.stream().anyMatch(DEV_PROFILES::contains);
            if (!hasDev) {
                throw new IllegalStateException(
                    "SECURITY ERROR: ace.security.dev-stub-auth=true is only allowed when a " +
                    "dev/local/test Spring profile is active. Current profiles: " + activeProfiles +
                    ". Set spring.profiles.active=dev or disable dev-stub-auth."
                );
            }
            log.warn(">>> DEV STUB AUTH ENABLED — hardcoded test user will be injected. " +
                     "This must NEVER be used in production. Active profiles: {}", activeProfiles);
        }
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

        if (props.getSecurity().isDevStubAuth()) {
            // --- DEV STUB: inject hardcoded test user (dev/local profile only) ---
            String user = "dev-user@example.com";
            String groups = "ace-admins,ace-editors";

            request.setAttribute("ace.user", user);
            request.setAttribute("ace.groups", groups);

            var auth = new UsernamePasswordAuthenticationToken(
                    user, null,
                    List.of(new SimpleGrantedAuthority("ace-admins"),
                            new SimpleGrantedAuthority("ace-editors"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            log.debug("DevStubAuth: injected user={} groups={}", user, groups);
        } else {
            // --- PRODUCTION: read identity from Spring Security principal ---
            // The principal must be set by an upstream auth mechanism (OIDC ResourceServer,
            // SAML, pre-auth filter, etc.) configured in SecurityConfig.
            // We NEVER read identity from HTTP request headers — that would allow spoofing.
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth == null || !auth.isAuthenticated()
                    || "anonymousUser".equals(auth.getPrincipal())) {
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"error\":\"Authentication required. No authenticated principal found. " +
                    "Configure OIDC/SAML/pre-auth in SecurityConfig.\"}"
                );
                return;
            }

            String user = auth.getName();
            // Extract groups from GrantedAuthorities, stripping ROLE_ prefix if present.
            String groups = auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                    .collect(Collectors.joining(","));

            request.setAttribute("ace.user", user);
            request.setAttribute("ace.groups", groups);
        }

        chain.doFilter(req, res);
    }
}
