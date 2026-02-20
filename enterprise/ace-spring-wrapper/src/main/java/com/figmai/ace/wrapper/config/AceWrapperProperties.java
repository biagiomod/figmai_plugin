package com.figmai.ace.wrapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Typed configuration properties for the ACE wrapper.
 * Bound from application.yml / custom-ace.yml under the "ace" prefix.
 */
@Component
@ConfigurationProperties(prefix = "ace")
public class AceWrapperProperties {

    private Routes routes = new Routes();
    private Proxy proxy = new Proxy();
    private Security security = new Security();
    private Audit audit = new Audit();

    // --- Routes ---
    public static class Routes {
        private String siteBasePath = "/home";
        private String aceBasePath = "/home/admin";
        private String apiBasePath = "/api";
        public String getSiteBasePath() { return siteBasePath; }
        public void setSiteBasePath(String v) { this.siteBasePath = v; }
        public String getAceBasePath() { return aceBasePath; }
        public void setAceBasePath(String v) { this.aceBasePath = v; }
        public String getApiBasePath() { return apiBasePath; }
        public void setApiBasePath(String v) { this.apiBasePath = v; }
    }

    // --- Proxy ---
    public static class Proxy {
        private String nodeBaseUrl = "http://127.0.0.1:3333";
        private String wrapperToken = "REPLACE_ME_LONG_RANDOM";
        private int connectTimeoutMs = 5000;
        private int readTimeoutMs = 30000;
        private int maxRequestBytes = 10_485_760; // 10 MB
        private Map<String, List<String>> allowlist = Map.of();
        public String getNodeBaseUrl() { return nodeBaseUrl; }
        public void setNodeBaseUrl(String v) { this.nodeBaseUrl = v; }
        public String getWrapperToken() { return wrapperToken; }
        public void setWrapperToken(String v) { this.wrapperToken = v; }
        public int getConnectTimeoutMs() { return connectTimeoutMs; }
        public void setConnectTimeoutMs(int v) { this.connectTimeoutMs = v; }
        public int getReadTimeoutMs() { return readTimeoutMs; }
        public void setReadTimeoutMs(int v) { this.readTimeoutMs = v; }
        public int getMaxRequestBytes() { return maxRequestBytes; }
        public void setMaxRequestBytes(int v) { this.maxRequestBytes = v; }
        public Map<String, List<String>> getAllowlist() { return allowlist; }
        public void setAllowlist(Map<String, List<String>> v) { this.allowlist = v; }
    }

    // --- Security ---
    public static class Security {
        private boolean enableAuth = false;
        private boolean devStubAuth = false;
        private String userHeaderName = "X-ACE-User";
        private String groupsHeaderName = "X-ACE-Groups";
        private String roleHeaderName = "X-ACE-Role";
        private boolean allowGroupsFallback = false;
        private List<String> trustedProxyIps = List.of();
        private Map<String, String> groupToRoleMap = Map.of(
                "ace-admins", "admin",
                "ace-managers", "manager",
                "ace-editors", "editor",
                "ace-reviewers", "reviewer"
        );
        private Headers headers = new Headers();

        public boolean isEnableAuth() { return enableAuth; }
        public void setEnableAuth(boolean v) { this.enableAuth = v; }
        public boolean isDevStubAuth() { return devStubAuth; }
        public void setDevStubAuth(boolean v) { this.devStubAuth = v; }
        public String getUserHeaderName() { return userHeaderName; }
        public void setUserHeaderName(String v) { this.userHeaderName = v; }
        public String getGroupsHeaderName() { return groupsHeaderName; }
        public void setGroupsHeaderName(String v) { this.groupsHeaderName = v; }
        public String getRoleHeaderName() { return roleHeaderName; }
        public void setRoleHeaderName(String v) { this.roleHeaderName = v; }
        public boolean isAllowGroupsFallback() { return allowGroupsFallback; }
        public void setAllowGroupsFallback(boolean v) { this.allowGroupsFallback = v; }
        public List<String> getTrustedProxyIps() { return trustedProxyIps; }
        public void setTrustedProxyIps(List<String> v) { this.trustedProxyIps = v; }
        public Map<String, String> getGroupToRoleMap() { return groupToRoleMap; }
        public void setGroupToRoleMap(Map<String, String> v) { this.groupToRoleMap = v; }
        public Headers getHeaders() { return headers; }
        public void setHeaders(Headers v) { this.headers = v; }

        public static class Headers {
            private String contentSecurityPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;";
            private String xFrameOptions = "DENY";
            private String xContentTypeOptions = "nosniff";
            public String getContentSecurityPolicy() { return contentSecurityPolicy; }
            public void setContentSecurityPolicy(String v) { this.contentSecurityPolicy = v; }
            public String getXFrameOptions() { return xFrameOptions; }
            public void setXFrameOptions(String v) { this.xFrameOptions = v; }
            public String getXContentTypeOptions() { return xContentTypeOptions; }
            public void setXContentTypeOptions(String v) { this.xContentTypeOptions = v; }
        }
    }

    // --- Audit ---
    public static class Audit {
        private boolean enabled = true;
        private String mode = "stdout"; // stdout | file
        private String logPath = "./logs/ace-audit.jsonl";
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean v) { this.enabled = v; }
        public String getMode() { return mode; }
        public void setMode(String v) { this.mode = v; }
        public String getLogPath() { return logPath; }
        public void setLogPath(String v) { this.logPath = v; }
    }

    // --- Accessors ---
    public Routes getRoutes() { return routes; }
    public void setRoutes(Routes routes) { this.routes = routes; }
    public Proxy getProxy() { return proxy; }
    public void setProxy(Proxy proxy) { this.proxy = proxy; }
    public Security getSecurity() { return security; }
    public void setSecurity(Security security) { this.security = security; }
    public Audit getAudit() { return audit; }
    public void setAudit(Audit audit) { this.audit = audit; }
}
