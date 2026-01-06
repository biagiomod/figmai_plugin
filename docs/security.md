# Security & Data Storage Guide

Security considerations and data storage locations for the FigmAI plugin.

---

## Data Storage Locations

### Figma ClientStorage

**Location:** Browser localStorage (managed by Figma)

**Stored Data:**
- Proxy base URL
- Authentication tokens (shared_token or session_token)
- Default model name
- Request timeout
- User preferences

**Storage Key:** `figmai_settings`

**Security:**
- ✅ Encrypted by browser
- ✅ Isolated per Figma installation
- ✅ Not accessible to other plugins
- ⚠️ Accessible via Figma DevTools (for debugging)

**Access:**
```typescript
// Read
const settings = await figma.clientStorage.getAsync('figmai_settings')

// Write
await figma.clientStorage.setAsync('figmai_settings', settings)

// Delete
await figma.clientStorage.deleteAsync('figmai_settings')
```

### Message History

**Location:** In-memory (plugin main thread)

**Stored Data:**
- Chat message history
- Tool call results
- Selection summaries

**Security:**
- ✅ Not persisted to disk
- ✅ Cleared on plugin restart
- ⚠️ Accessible in memory during session

**Note:** Message history is not persisted. Each plugin session starts fresh.

### Selection Data

**Location:** In-memory (plugin main thread)

**Stored Data:**
- Selected node IDs
- Selection summaries (text, metadata)

**Security:**
- ✅ Not persisted
- ✅ Cleared on selection change
- ⚠️ Sent to proxy server in requests

**Note:** Selection data is included in LLM requests. Ensure proxy server handles data appropriately.

---

## Credential Management

### Authentication Tokens

**Storage:** Figma clientStorage (`figmai_settings.sharedToken` or `figmai_settings.sessionToken`)

**Types:**
1. **Shared Token:** Static token for personal/work use
2. **Session Token:** Dynamic token (future implementation)

**Security Best Practices:**
- ✅ Tokens stored in encrypted browser storage
- ✅ Not logged to console
- ✅ Not included in error messages
- ⚠️ Visible in Settings UI (masked as password field)
- ⚠️ Accessible via Figma DevTools

**Recommendations:**
- Use session tokens when available (more secure)
- Rotate shared tokens regularly
- Never commit tokens to version control
- Use environment variables for CI/CD (not for plugin runtime)

### Proxy Server Authentication

**Method:** HTTP headers

**Headers:**
- `X-FigmAI-Token`: For shared_token mode
- `Authorization: Bearer {token}`: For session_token mode

**Security:**
- ✅ Tokens sent over HTTPS only
- ✅ Not included in URL parameters
- ⚠️ Visible in network tab (HTTPS encrypted)

---

## Network Security

### Proxy Communication

**Protocol:** HTTPS only

**Endpoints:**
- `{proxyBaseUrl}/health` - Health check (GET)
- `{proxyBaseUrl}/v1/chat` - Chat requests (POST)

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
X-FigmAI-Token: {token} (or Authorization: Bearer {token})
```

**Request Body:**
```json
{
  "model": "gpt-4.1-mini",
  "messages": [...],
  "assistantId": "general",
  "selectionSummary": "...",
  "images": [...]
}
```

**Security:**
- ✅ All requests use HTTPS
- ✅ No credentials in URL
- ✅ Tokens in headers only
- ⚠️ Request body may contain design data (ensure proxy handles appropriately)

### CORS Requirements

**Required Headers from Proxy:**
```
Access-Control-Allow-Origin: https://www.figma.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-FigmAI-Token, Authorization
```

**Note:** Proxy server must allow Figma origin for CORS.

---

## Data Privacy

### Data Sent to Proxy

**Included in Requests:**
- User messages
- Selection summaries (node metadata, text content)
- Exported images (if vision enabled)
- Assistant ID
- Quick action ID

**Not Included:**
- Full Figma file data
- All node properties
- User identity (unless added by proxy)
- Message history (only current request)

### Data Retention

**Plugin:**
- No data persisted locally
- Message history cleared on restart
- Settings persist (user preference)

**Proxy Server:**
- Retention policy determined by proxy server
- Review proxy server documentation for data retention

### Compliance Considerations

**For Work Environments:**
- Implement compliance hooks for request/response logging
- Sanitize sensitive data before sending
- Review proxy server compliance policies
- Ensure proxy server meets work security requirements

**See:** `docs/migration/extension-points.md` for compliance hook implementation.

---

## Security Best Practices

### For Users

1. **Token Management:**
   - Use strong, unique tokens
   - Rotate tokens regularly
   - Never share tokens
   - Use session tokens when available

2. **Network:**
   - Verify proxy URL is correct
   - Use HTTPS only
   - Check certificate validity

3. **Data:**
   - Be aware of what data is sent to proxy
   - Review selection before sending
   - Use compliance mode in work environments

### For Administrators (Work Environments)

1. **Proxy Server:**
   - Use HTTPS with valid certificates
   - Implement rate limiting
   - Log all requests for audit
   - Sanitize responses if needed
   - Implement token rotation

2. **Network:**
   - Whitelist proxy server IPs
   - Monitor outbound connections
   - Review firewall rules

3. **Compliance:**
   - Implement compliance hooks
   - Log all interactions
   - Review data retention policies
   - Ensure GDPR/CCPA compliance if applicable

---

## Threat Model

### Potential Threats

1. **Token Theft:**
   - **Risk:** Medium
   - **Mitigation:** Tokens in encrypted storage, HTTPS only, session tokens (future)

2. **Data Leakage:**
   - **Risk:** Low-Medium
   - **Mitigation:** Selection data only, no full file access, proxy server controls

3. **Man-in-the-Middle:**
   - **Risk:** Low
   - **Mitigation:** HTTPS only, certificate validation

4. **Malicious Proxy:**
   - **Risk:** Medium
   - **Mitigation:** Verify proxy URL, use trusted proxy servers only

5. **Plugin Compromise:**
   - **Risk:** Low
   - **Mitigation:** Code review, signed plugins, trusted sources

### Security Assumptions

1. **Figma Platform:**
   - Figma plugin sandbox is secure
   - Figma clientStorage is encrypted
   - Figma network requests are validated

2. **Proxy Server:**
   - Proxy server is trusted
   - Proxy server implements proper security
   - Proxy server handles data appropriately

3. **Network:**
   - HTTPS is secure
   - Certificates are valid
   - No MITM attacks

---

## Audit & Compliance

### Audit Logging

**Plugin:**
- No built-in audit logging
- Use compliance hooks for work environments

**Proxy Server:**
- Should log all requests
- Should log authentication attempts
- Should log errors

### Compliance Hooks

Implement compliance hooks for:
- Request validation
- Response sanitization
- Interaction logging
- Data redaction

**See:** `docs/migration/extension-points.md` for implementation guide.

---

## Incident Response

### If Token is Compromised

1. **Immediate:**
   - Revoke token on proxy server
   - Generate new token
   - Update plugin settings

2. **Investigation:**
   - Review proxy server logs
   - Check for unauthorized access
   - Review data access logs

3. **Prevention:**
   - Rotate tokens regularly
   - Use session tokens when available
   - Monitor for suspicious activity

### If Data is Leaked

1. **Immediate:**
   - Identify scope of leak
   - Notify affected parties
   - Revoke access if needed

2. **Investigation:**
   - Review proxy server logs
   - Identify leak source
   - Review access controls

3. **Prevention:**
   - Implement compliance hooks
   - Review data handling
   - Strengthen access controls

---

## Security Checklist

### For Work Environment Migration

- [ ] Verify proxy server uses HTTPS
- [ ] Verify proxy server certificate is valid
- [ ] Configure token rotation policy
- [ ] Implement compliance hooks
- [ ] Review data retention policy
- [ ] Configure audit logging
- [ ] Review firewall rules
- [ ] Test security controls
- [ ] Document security procedures
- [ ] Train users on security best practices

---

## Questions & Support

For security questions:
1. Review this guide
2. Check proxy server security documentation
3. Contact security team for work environments
4. Review Figma plugin security documentation

For security issues:
1. Report to security team immediately
2. Revoke compromised credentials
3. Review audit logs
4. Update security procedures



