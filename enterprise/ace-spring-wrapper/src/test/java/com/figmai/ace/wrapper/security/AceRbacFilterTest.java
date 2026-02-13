package com.figmai.ace.wrapper.security;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import com.figmai.ace.wrapper.proxy.RouteAllowlist;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class AceRbacFilterTest {

    private AceWrapperProperties props;
    private AceRbacFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        props = new AceWrapperProperties();
        props.getSecurity().setEnableAuth(true);
        props.getSecurity().setGroupToRoleMap(Map.of(
                "ace-admins", "admin",
                "ace-managers", "manager",
                "ace-editors", "editor",
                "ace-reviewers", "reviewer"
        ));
        filter = new AceRbacFilter(props);
        chain = mock(FilterChain.class);
    }

    @Test
    void mapsMultipleGroupsWithPriorityAndWhitespace() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/model");
        req.setAttribute("ace.user", "dev@example.com");
        req.setAttribute("ace.groups", " ace-editors , ace-managers ");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals("manager", req.getAttribute("ace.user.role"));
        assertEquals(RouteAllowlist.Tier.WRITE, req.getAttribute("ace.user.tier"));
    }

    @Test
    void mapsCaseInsensitiveGroups() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/model");
        req.setAttribute("ace.user", "dev@example.com");
        req.setAttribute("ace.groups", "ACE-ADMINS");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals("admin", req.getAttribute("ace.user.role"));
        assertEquals(RouteAllowlist.Tier.ADMIN, req.getAttribute("ace.user.tier"));
    }

    @Test
    void unknownGroupsDefaultToPublicTier() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/model");
        req.setAttribute("ace.user", "dev@example.com");
        req.setAttribute("ace.groups", "unknown-group");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        assertEquals("", req.getAttribute("ace.user.role"));
        assertEquals(RouteAllowlist.Tier.PUBLIC, req.getAttribute("ace.user.tier"));
    }
}
