package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitFilterTest {

    private RateLimitFilter filter;
    private AceWrapperProperties props;

    @BeforeEach
    void setUp() {
        props = new AceWrapperProperties();
        props.getSecurity().setTrustedProxyIps(List.of("10.0.0.10"));
        filter = new RateLimitFilter(props);
    }

    @Test
    void keyPrefersUserWhenPresent() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("203.0.113.1");
        req.setAttribute("ace.user", "alice@example.com");
        assertEquals("user:alice@example.com", filter.resolveKey(req));
    }

    @Test
    void keyFallsBackToRemoteIpWhenNoUser() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("203.0.113.2");
        req.addHeader("X-Forwarded-For", "198.51.100.2");
        assertEquals("ip:203.0.113.2", filter.resolveKey(req));
    }

    @Test
    void trustedProxyCanUseXForwardedFor() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.10");
        req.addHeader("X-Forwarded-For", "198.51.100.9, 10.0.0.10");
        assertEquals("ip:198.51.100.9", filter.resolveKey(req));
    }
}
