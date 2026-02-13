package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security configuration.
 *
 * Security model:
 *   - Spring Security handles: CSRF (disabled for stateless proxy), session policy,
 *     security headers (CSP, X-Frame-Options, X-Content-Type-Options).
 *   - Custom filter chain handles: identity resolution → RBAC → proxy.
 *
 * Identity resolution (DevStubAuthFilter):
 *   - enableAuth=false: no identity required (smoke-test mode).
 *   - enableAuth=true, devStubAuth=true: hardcoded test user (dev/local profile only).
 *   - enableAuth=true, devStubAuth=false: reads from Spring Security principal.
 *     The principal must be set by an upstream auth mechanism (see below).
 *
 * Header spoofing prevention:
 *   - Production mode (devStubAuth=false) NEVER reads identity from HTTP request headers.
 *   - Identity is extracted solely from the SecurityContext principal/authorities.
 *   - ProxyFilter strips all incoming identity headers (X-ACE-User, X-ACE-Groups, etc.)
 *     before forwarding requests to Node, then injects its own from request attributes.
 *
 * To enable authentication, configure one of:
 *   - JWT Resource Server: uncomment the oauth2ResourceServer line below.
 *   - SAML: add spring-security-saml2-service-provider dependency and configure.
 *   - Pre-auth: add a custom AbstractPreAuthenticatedProcessingFilter.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final AceWrapperProperties props;

    public SecurityConfig(AceWrapperProperties props) {
        this.props = props;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        var headers = props.getSecurity().getHeaders();

        http
            // Disable CSRF — wrapper is a stateless reverse proxy
            .csrf(csrf -> csrf.disable())
            // Stateless sessions
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Security headers
            .headers(h -> {
                h.contentSecurityPolicy(csp -> csp.policyDirectives(headers.getContentSecurityPolicy()));
                if ("DENY".equalsIgnoreCase(headers.getXFrameOptions())) {
                    h.frameOptions(fo -> fo.deny());
                } else if ("SAMEORIGIN".equalsIgnoreCase(headers.getXFrameOptions())) {
                    h.frameOptions(fo -> fo.sameOrigin());
                } else {
                    h.frameOptions(fo -> fo.disable());
                }
                h.contentTypeOptions(c -> {});
            });

        // Authorization: permitAll at the Spring Security level.
        // Actual identity + RBAC enforcement is in the custom servlet filter chain
        // (DevStubAuthFilter → AceRbacFilter → ProxyFilter).
        //
        // This is safe because:
        //   - DevStubAuthFilter returns 401 when no authenticated principal exists
        //     (production mode reads from SecurityContext, NOT from HTTP headers).
        //   - ProxyFilter strips spoofable headers and only injects verified identity.
        //   - AceRbacFilter enforces tiered RBAC on all non-public routes.
        //
        // To enable JWT-based authentication (sets the SecurityContext principal):
        //   http.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        // Then configure issuer-uri in application.yml:
        //   spring.security.oauth2.resourceserver.jwt.issuer-uri: https://your-idp.example.com
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
