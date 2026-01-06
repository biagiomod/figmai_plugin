# FigmAI Plugin - QA Documentation

This directory contains QA documentation for the FigmAI Figma plugin system.

## Quick Links

- **[Smoke Test Checklist](./QA_SMOKE_TESTS.md)** - Manual testing checklist for core functionality
- **[Proxy Test Commands](./QA_TEST_COMMANDS.md)** - Curl commands for testing proxy endpoints
- **[Unit Test Recommendations](./QA_UNIT_TEST_RECOMMENDATIONS.md)** - Recommended unit tests for pure utility modules

---

## QA Workflow

### After Each Meaningful Change

1. **Run Smoke Tests** (`QA_SMOKE_TESTS.md`)
   - Test affected features
   - Record results in checklist
   - Document any failures

2. **Test Proxy Endpoints** (if proxy-related changes)
   - Use commands from `QA_TEST_COMMANDS.md`
   - Verify error handling
   - Check response times

3. **Update Documentation** (if needed)
   - Update test results
   - Add new test cases for new features
   - Update test commands for new endpoints

### Before Releases

1. **Complete Full Smoke Test Run**
   - All test categories
   - All error scenarios
   - All assistants and quick actions

2. **Verify Proxy Integration**
   - Test all proxy endpoints
   - Verify authentication
   - Check error responses

3. **Review Unit Test Coverage** (when implemented)
   - Run unit tests
   - Check coverage reports
   - Add tests for new utilities

---

## Test Categories

### 1. Settings Modal + Proxy Test
- Settings persistence
- Proxy connection testing
- Error handling

### 2. Chat Send/Receive
- Basic chat flow
- Selection context
- Message history

### 3. Assistant Switching
- Assistant selection
- Intro messages
- Quick action updates

### 4. Quick Actions
- Selection requirements
- Vision export
- Action execution

### 5. Error States
- 401 Unauthorized
- 500 Server Error
- Timeout handling
- Network errors

### 6. Slow Plugin Response
- Loading states
- Multiple requests
- UI responsiveness

### 7. Vision Export
- Image export
- Size limits
- Multiple images

---

## Proxy Testing

### Quick Test
```bash
# Set environment variables
export PROXY_BASE_URL="https://your-ngrok-url.ngrok-free.dev"
export SHARED_TOKEN="your-token"

# Run test script
./test-proxy.sh
```

### Manual Testing
See `QA_TEST_COMMANDS.md` for detailed curl commands.

---

## Unit Testing (Future)

When unit tests are implemented:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

See `QA_UNIT_TEST_RECOMMENDATIONS.md` for implementation details.

---

## Bug Reporting

When tests fail:

1. **Document the failure** in smoke test checklist
2. **Capture logs** from Figma console
3. **Test with curl** to isolate plugin vs proxy issues
4. **Create bug report** with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Logs/error messages
   - Environment details

---

## Maintenance

### Updating Checklists

- Add new test cases when features are added
- Remove obsolete tests when features are removed
- Update test commands when API changes
- Keep test results current

### Test Command Updates

- Update curl commands when proxy API changes
- Add new endpoints as they're added
- Update error response formats
- Keep environment variable examples current

---

## Questions?

- Check existing documentation first
- Review test results for similar issues
- Test with curl to isolate problems
- Check proxy server logs for backend issues

---

## Related Documentation

- [Proxy Setup Guide](../docs/proxy-and-plugin-setup.md)
- [Main README](../README.md)
- [Refactor Audit](../REFACTOR_AUDIT.md)

