package com.figmai.ace.wrapper;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import com.figmai.ace.wrapper.proxy.RouteAllowlist;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class RouteAllowlistTest {

    private AceWrapperProperties props;

    @BeforeEach
    void setUp() {
        props = new AceWrapperProperties();
        var proxy = new AceWrapperProperties.Proxy();
        proxy.setAllowlist(Map.of(
            "public", List.of(
                "GET /api/build-info",
                "GET /home/**", "HEAD /home/**",
                "GET /home/admin/**", "HEAD /home/admin/**",
                "GET /fonts.css", "HEAD /fonts.css",
                "GET /styles.css", "HEAD /styles.css",
                "GET /assets/**", "HEAD /assets/**"
            ),
            "read", List.of(
                "GET /api/model",
                "GET /api/kb/**"
            ),
            "write", List.of(
                "POST /api/validate",
                "POST /api/save",
                "POST /api/kb/**",
                "PUT /api/kb/**",
                "DELETE /api/kb/**"
            ),
            "admin", List.of(
                "* /api/admin/**",
                "PATCH /api/users/**"
            )
        ));
        props.setProxy(proxy);
    }

    private RouteAllowlist build() {
        RouteAllowlist ral = new RouteAllowlist(props);
        ral.init();
        return ral;
    }

    @Test
    void publicRouteMatches() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/api/build-info"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/home/about"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/home/admin/"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/home/admin/app.js"));
    }

    @Test
    void readRouteMatches() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.READ), ral.match("GET", "/api/model"));
        assertEquals(Optional.of(RouteAllowlist.Tier.READ), ral.match("GET", "/api/kb/123"));
    }

    @Test
    void writeRouteMatches() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.WRITE), ral.match("POST", "/api/validate"));
        assertEquals(Optional.of(RouteAllowlist.Tier.WRITE), ral.match("POST", "/api/save"));
        assertEquals(Optional.of(RouteAllowlist.Tier.WRITE), ral.match("DELETE", "/api/kb/123"));
    }

    @Test
    void adminWildcardMethodMatches() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.ADMIN), ral.match("GET", "/api/admin/users"));
        assertEquals(Optional.of(RouteAllowlist.Tier.ADMIN), ral.match("POST", "/api/admin/config"));
        assertEquals(Optional.of(RouteAllowlist.Tier.ADMIN), ral.match("PATCH", "/api/users/42"));
    }

    @Test
    void unknownRouteBlocked() {
        RouteAllowlist ral = build();
        assertEquals(Optional.empty(), ral.match("GET", "/api/secret"));
        assertEquals(Optional.empty(), ral.match("POST", "/foo"));
        assertEquals(Optional.empty(), ral.match("DELETE", "/api/build-info")); // wrong method
    }

    @Test
    void methodCaseInsensitive() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("get", "/api/build-info"));
        assertEquals(Optional.of(RouteAllowlist.Tier.WRITE), ral.match("post", "/api/save"));
    }

    @Test
    void encodedTraversalIsRejected() {
        RouteAllowlist ral = build();
        assertEquals(Optional.empty(), ral.match("GET", "/api/%2f%2e%2e%2fmodel"));
        assertEquals(Optional.empty(), ral.match("GET", "/api/%2E%2E/model"));
    }

    @Test
    void doubleEncodedTraversalIsRejected() {
        RouteAllowlist ral = build();
        // %252e%252e decodes to %2e%2e on first pass -> rejected before second decode
        assertEquals(Optional.empty(), ral.match("GET", "/api/%252e%252e/model"));
        // %252f decodes to %2f -> rejected
        assertEquals(Optional.empty(), ral.match("GET", "/api/%252fmodel"));
        // %255c decodes to %5c -> rejected
        assertEquals(Optional.empty(), ral.match("GET", "/api/%255c..%255c/model"));
    }

    @Test
    void safeEncodedPathRemains() {
        RouteAllowlist ral = build();
        // %20 (space) in a query segment is harmless and should be allowed
        assertEquals(Optional.of(RouteAllowlist.Tier.READ), ral.match("GET", "/api/kb/my%20doc"));
    }

    @Test
    void nullByteRejected() {
        RouteAllowlist ral = build();
        assertEquals(Optional.empty(), ral.match("GET", "/api/model\u0000"));
    }

    @Test
    void doubleSlashesAreNormalized() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.READ), ral.match("GET", "//api//model"));
        assertEquals(Optional.of(RouteAllowlist.Tier.READ), ral.match("GET", "/api//kb//123"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "//home//admin//"));
    }

    @Test
    void mixedCaseMethodAndPathBehavior() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GeT", "/api/build-info"));
        // Path matching remains case-sensitive by design.
        assertEquals(Optional.empty(), ral.match("GET", "/API/BUILD-INFO"));
    }

    @Test
    void headMethodAllowedForPublicStaticRoutes() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/home/admin/app.js"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/home/admin/styles.css"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/home/admin/fonts.css"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/home/admin/"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/home/"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/fonts.css"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/styles.css"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("HEAD", "/assets/logo.svg"));
    }

    @Test
    void rootRelativeAssetsMatchPublic() {
        RouteAllowlist ral = build();
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/fonts.css"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/styles.css"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/assets/logo-figmai.svg"));
        assertEquals(Optional.of(RouteAllowlist.Tier.PUBLIC), ral.match("GET", "/assets/icons/icon.png"));
    }

    @Test
    void emptyAllowlistBlocksAll() {
        props.getProxy().setAllowlist(Map.of());
        RouteAllowlist ral = build();
        assertEquals(Optional.empty(), ral.match("GET", "/home"));
    }
}
