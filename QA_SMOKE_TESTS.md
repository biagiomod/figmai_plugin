# FigmAI Plugin - QA Smoke Test Checklist

**Last Updated**: [Auto-updated after each test run]  
**Tested By**: [Name]  
**Test Date**: [Date]

## Purpose

This checklist ensures core functionality works after meaningful changes. Run this after:
- Settings/proxy configuration changes
- Assistant switching logic changes
- Quick action implementations
- Error handling updates
- Provider/provider factory changes
- UI component updates affecting core flows

---

## Test Environment Setup

**Prerequisites:**
- [ ] Proxy server running locally (or accessible via ngrok)
- [ ] Figma plugin built and loaded in development mode
- [ ] Valid proxy base URL configured
- [ ] Valid shared token configured
- [ ] Test Figma file with sample frames/text layers

**Proxy Configuration:**
- Base URL: `_________________`
- Shared Token: `_________________` (masked in logs)
- Default Model: `_________________`

---

## 1. Settings Modal + Proxy Test

### 1.1 Settings Modal Display
- [ ] Click Settings icon (top right)
- [ ] Modal opens with all fields visible
- [ ] Mode selection (Simple/Advanced) works
- [ ] Proxy Base URL field is editable
- [ ] Default Model field is editable
- [ ] Auth Mode dropdown works (Shared Token/Session Token)
- [ ] Token field appears based on auth mode selection
- [ ] Test Connection button is visible

**Expected**: Modal displays correctly, all fields functional

### 1.2 Settings Persistence
- [ ] Enter proxy base URL: `https://test-proxy.example.com`
- [ ] Enter default model: `gpt-4.1-mini`
- [ ] Enter shared token: `test-token-123`
- [ ] Click Save
- [ ] Close modal
- [ ] Reopen Settings modal
- [ ] Verify all values persisted correctly

**Expected**: Settings saved and loaded correctly

### 1.3 Proxy Connection Test (Success)
- [ ] Open Settings modal
- [ ] Enter valid proxy base URL
- [ ] Enter valid shared token
- [ ] Click "Test Connection"
- [ ] Wait for test result
- [ ] Verify success message appears (green)
- [ ] Verify latency is displayed (if available)

**Expected**: Connection test succeeds with success message

### 1.4 Proxy Connection Test (Failure Cases)
- [ ] **Invalid URL**: Enter `http://invalid-url-12345.com`
- [ ] Click "Test Connection"
- [ ] Verify error message appears (red)
- [ ] Verify error message is actionable

- [ ] **Invalid Token**: Enter valid URL but invalid token
- [ ] Click "Test Connection"
- [ ] Verify 401/403 error message appears
- [ ] Verify error suggests checking token

- [ ] **Timeout**: Use URL that doesn't respond (or proxy down)
- [ ] Click "Test Connection"
- [ ] Verify timeout error message appears
- [ ] Verify error suggests checking proxy status

**Expected**: All error cases show clear, actionable messages

---

## 2. Chat Send/Receive

### 2.1 Basic Chat Flow
- [ ] Type message: "Hello, how are you?"
- [ ] Click Send button (or press Enter)
- [ ] Verify loading indicator appears
- [ ] Verify user message appears in chat
- [ ] Wait for assistant response
- [ ] Verify assistant message appears
- [ ] Verify loading indicator disappears
- [ ] Verify response is formatted correctly (markdown if applicable)

**Expected**: Complete chat flow works end-to-end

### 2.2 Chat with Selection
- [ ] Select a frame in Figma canvas
- [ ] Verify selection indicator shows selected item
- [ ] Type message: "Explain this design"
- [ ] Toggle "Include Selection" (Advanced mode) or verify auto-included
- [ ] Click Send
- [ ] Verify selection summary is included in request (check console/logs)
- [ ] Verify assistant response references the selection

**Expected**: Selection context included in chat

### 2.3 Chat History
- [ ] Send 3-4 messages in sequence
- [ ] Verify all messages appear in order
- [ ] Verify user messages on right, assistant on left
- [ ] Verify message timestamps are reasonable
- [ ] Verify conversation context is maintained

**Expected**: Chat history maintained correctly

### 2.4 Empty Input Handling
- [ ] Leave input field empty
- [ ] Click Send button
- [ ] Verify button is disabled or message not sent
- [ ] Verify no error/loading state appears

**Expected**: Empty messages are prevented

---

## 3. Assistant Switching

### 3.1 Assistant Selection
- [ ] Click Assistant selector button (bottom left)
- [ ] Verify modal opens with all assistants listed
- [ ] Verify assistant icons display correctly
- [ ] Verify assistant labels and descriptions visible
- [ ] Click on "Design Critique" assistant
- [ ] Verify modal closes
- [ ] Verify assistant name updates in selector
- [ ] Verify assistant icon updates

**Expected**: Assistant switching works correctly

### 3.2 Assistant Intro Message
- [ ] Switch to "General" assistant
- [ ] Verify intro message appears in chat
- [ ] Switch to "Design Critique" assistant
- [ ] Verify new intro message appears
- [ ] Verify previous messages remain in history

**Expected**: Intro messages appear on switch

### 3.3 Assistant-Specific Quick Actions
- [ ] Switch to "Design Critique" assistant
- [ ] Verify "Give Design Crit" quick action appears
- [ ] Switch to "Code2Design" assistant
- [ ] Verify "SEND JSON", "GET JSON", "How to format JSON" actions appear
- [ ] Switch to "General" assistant
- [ ] Verify appropriate quick actions appear

**Expected**: Quick actions match selected assistant

---

## 4. Quick Actions

### 4.1 Quick Action with Selection
- [ ] Select a frame in Figma canvas
- [ ] Switch to "Design Critique" assistant
- [ ] Click "Give Design Crit" quick action
- [ ] Verify "Analyzing your design..." message appears
- [ ] Verify image export happens (check console/logs)
- [ ] Wait for critique response
- [ ] Verify critique appears in chat or on canvas (if applicable)

**Expected**: Quick action executes with selection

### 4.2 Quick Action without Selection (Required)
- [ ] Deselect all items in Figma
- [ ] Switch to "Design Critique" assistant
- [ ] Click "Give Design Crit" quick action
- [ ] Verify error message appears: "This action requires a selection"
- [ ] Verify selection indicator shows error state (red)
- [ ] Verify no request is sent to proxy

**Expected**: Selection requirement enforced

### 4.3 Quick Action without Selection (Optional)
- [ ] Deselect all items in Figma
- [ ] Switch to "General" assistant
- [ ] Click "Design suggestions" quick action
- [ ] Verify action executes without selection
- [ ] Verify response is received

**Expected**: Optional selection actions work without selection

### 4.4 Vision Export (if enabled)
- [ ] Select a frame with visual content
- [ ] Switch to assistant with vision-enabled quick action
- [ ] Click vision-enabled quick action
- [ ] Verify image export happens (check console for image data)
- [ ] Verify images are included in proxy request (check logs)
- [ ] Verify response references visual content

**Expected**: Vision export and inclusion works

---

## 5. Error States

### 5.1 401 Unauthorized
- [ ] Set invalid shared token in Settings
- [ ] Save settings
- [ ] Send a chat message
- [ ] Verify error message appears: "Authentication failed. Please check your token in Settings."
- [ ] Verify error is user-friendly and actionable

**Expected**: 401 errors handled gracefully

### 5.2 500 Server Error
- [ ] Configure proxy to return 500 (or use test endpoint)
- [ ] Send a chat message
- [ ] Verify error message appears: "Server error (500): The server encountered an error. Please try again later."
- [ ] Verify error suggests retry

**Expected**: 500 errors handled gracefully

### 5.3 Timeout
- [ ] Set request timeout to very low value (1000ms) or use slow endpoint
- [ ] Send a chat message
- [ ] Verify timeout error appears: "Request timeout. The server took too long to respond. Please try again."
- [ ] Verify error suggests retry

**Expected**: Timeout errors handled gracefully

### 5.4 Network Error
- [ ] Set invalid proxy base URL (unreachable)
- [ ] Send a chat message
- [ ] Verify network error appears: "Network error: [details]"
- [ ] Verify error is actionable

**Expected**: Network errors handled gracefully

### 5.5 Rate Limit (429)
- [ ] Trigger rate limit (if testable)
- [ ] Verify rate limit error appears: "Rate limit exceeded. Please try again in a moment."
- [ ] Verify error suggests retry

**Expected**: Rate limit errors handled gracefully

---

## 6. Slow Plugin Response and Interaction

### 6.1 Loading States
- [ ] Send a message that takes >3 seconds to respond
- [ ] Verify loading indicator appears immediately
- [ ] Verify loading indicator persists during request
- [ ] Verify input is disabled or clearly shows "processing"
- [ ] Verify user can still see previous messages

**Expected**: Loading states are clear and non-blocking

### 6.2 Multiple Rapid Requests
- [ ] Send message 1
- [ ] Immediately send message 2 (before response 1 arrives)
- [ ] Verify both requests are queued/handled
- [ ] Verify responses appear in order
- [ ] Verify no race conditions or state corruption

**Expected**: Multiple requests handled correctly

### 6.3 UI Responsiveness During Long Operations
- [ ] Trigger a vision export (slow operation)
- [ ] Verify UI remains responsive
- [ ] Verify user can still interact with other UI elements
- [ ] Verify no UI freezing or blocking

**Expected**: UI remains responsive during slow operations

---

## 7. Vision Export (if enabled)

### 7.1 Image Export
- [ ] Select a frame
- [ ] Trigger vision-enabled quick action
- [ ] Verify image export happens (check console)
- [ ] Verify image data is base64 encoded
- [ ] Verify image metadata (name, width, height) included

**Expected**: Image export works correctly

### 7.2 Image Size Limits
- [ ] Select very large frame (if applicable)
- [ ] Trigger vision export
- [ ] Verify image is scaled appropriately
- [ ] Verify image size is within limits

**Expected**: Image size handled appropriately

### 7.3 Multiple Images
- [ ] Select multiple frames
- [ ] Trigger vision export with maxImages > 1
- [ ] Verify multiple images exported
- [ ] Verify all images included in request

**Expected**: Multiple image export works

---

## 8. Regression Checks

### 8.1 Settings Persistence Across Sessions
- [ ] Configure settings
- [ ] Close Figma
- [ ] Reopen Figma and plugin
- [ ] Verify settings persisted

**Expected**: Settings persist across sessions

### 8.2 Selection State Updates
- [ ] Select item A
- [ ] Verify selection indicator updates
- [ ] Select item B (add to selection)
- [ ] Verify both items shown
- [ ] Deselect item A
- [ ] Verify only item B shown

**Expected**: Selection state updates correctly

### 8.3 Mode Switching
- [ ] Switch to Advanced mode
- [ ] Verify "Include Selection" toggle appears
- [ ] Switch to Simple mode
- [ ] Verify toggle behavior changes appropriately

**Expected**: Mode switching works correctly

---

## Test Results Summary

**Total Tests**: ___  
**Passed**: ___  
**Failed**: ___  
**Skipped**: ___

### Failed Tests
[List any failed tests with details]

### Notes
[Any additional observations or issues]

---

## Next Steps After Test Run

1. **If all tests pass**: Update "Last Updated" date, commit results
2. **If tests fail**: 
   - Document failure details
   - Create bug report or fix immediately
   - Re-run affected test cases after fix
3. **If new issues found**: Add to checklist as new test cases

---

## Test Commands Reference

See `QA_TEST_COMMANDS.md` for curl commands to test proxy endpoints directly.

