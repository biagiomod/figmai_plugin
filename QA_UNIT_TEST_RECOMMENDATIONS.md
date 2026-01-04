# FigmAI Plugin - Unit Test Recommendations

This document identifies pure utility modules that would benefit from unit tests. These modules have low risk but high value for regression prevention.

## Testing Philosophy

**Test Pure Functions:**
- No Figma API dependencies
- No side effects
- Deterministic inputs/outputs
- Easy to mock/stub

**Don't Test (Yet):**
- Figma plugin runtime code (requires Figma environment)
- UI components (requires Preact/Figma UI runtime)
- Provider implementations (requires network/proxy)
- Main event handlers (requires full plugin context)

**Priority:**
- 🟢 **High Priority**: Core utilities used across codebase
- 🟡 **Medium Priority**: Helper functions with edge cases
- 🔵 **Low Priority**: Simple getters/setters

---

## Recommended Test Modules

### 1. Settings Normalization (High Priority)

**File**: `src/core/settings.ts`  
**Risk**: Medium (URL normalization bugs could break proxy connections)  
**Testability**: High (pure functions, easy to mock `figma.clientStorage`)

**Functions to Test:**
- `normalizeProxyBaseUrl(url: string)` - URL normalization logic
- `getSettings()` - Default merging and normalization
- `saveSettings()` - Settings persistence and normalization

**Test Cases:**
```typescript
describe('normalizeProxyBaseUrl', () => {
  it('removes trailing slashes', () => {
    expect(normalizeProxyBaseUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeProxyBaseUrl('https://example.com///')).toBe('https://example.com')
  })
  
  it('trims whitespace', () => {
    expect(normalizeProxyBaseUrl('  https://example.com  ')).toBe('https://example.com')
  })
  
  it('handles empty strings', () => {
    expect(normalizeProxyBaseUrl('')).toBe('')
  })
  
  it('preserves valid URLs', () => {
    expect(normalizeProxyBaseUrl('https://example.com')).toBe('https://example.com')
  })
})

describe('getSettings', () => {
  it('returns defaults when no stored settings', async () => {
    // Mock figma.clientStorage.getAsync to return null
    const settings = await getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })
  
  it('merges stored settings with defaults', async () => {
    // Mock stored settings
    const stored = { proxyBaseUrl: 'https://test.com/' }
    const settings = await getSettings()
    expect(settings.proxyBaseUrl).toBe('https://test.com') // Normalized
    expect(settings.defaultModel).toBe(DEFAULT_SETTINGS.defaultModel)
  })
  
  it('normalizes proxyBaseUrl on load', async () => {
    // Mock stored settings with trailing slash
    const stored = { proxyBaseUrl: 'https://test.com///' }
    const settings = await getSettings()
    expect(settings.proxyBaseUrl).toBe('https://test.com')
  })
})
```

**Test Framework**: Jest or Vitest  
**Mocking**: Mock `figma.clientStorage` methods

---

### 2. Message Normalization (High Priority)

**File**: `src/core/provider/normalize.ts`  
**Risk**: Medium (message format bugs could break provider communication)  
**Testability**: High (pure functions, no dependencies)

**Functions to Test:**
- `normalizeMessages()` - Message array normalization
- `normalizeRole()` - Role string normalization
- `normalizeImageData()` - Image data validation
- `extractResponseText()` - Response text extraction
- `stripMarkdown()` - Markdown removal

**Test Cases:**
```typescript
describe('normalizeMessages', () => {
  it('filters invalid messages', () => {
    const input = [
      { role: 'user', content: 'Hello' },
      { role: '', content: 'Invalid' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '  Valid  ' }
    ]
    const result = normalizeMessages(input)
    expect(result).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'user', content: 'Valid' }
    ])
  })
  
  it('normalizes role strings', () => {
    const input = [
      { role: 'USER', content: 'Test' },
      { role: 'Assistant', content: 'Test' },
      { role: 'unknown', content: 'Test' }
    ]
    const result = normalizeMessages(input)
    expect(result[0].role).toBe('user')
    expect(result[1].role).toBe('assistant')
    expect(result[2].role).toBe('user') // Defaults to user
  })
  
  it('trims message content', () => {
    const input = [{ role: 'user', content: '  Hello  ' }]
    const result = normalizeMessages(input)
    expect(result[0].content).toBe('Hello')
  })
})

describe('extractResponseText', () => {
  it('extracts text from string response', () => {
    expect(extractResponseText('Hello')).toBe('Hello')
  })
  
  it('extracts text from object with text field', () => {
    expect(extractResponseText({ text: 'Hello' })).toBe('Hello')
  })
  
  it('extracts text from OpenAI format', () => {
    const openAIResponse = {
      choices: [{
        message: {
          content: 'Hello from OpenAI'
        }
      }]
    }
    expect(extractResponseText(openAIResponse)).toBe('Hello from OpenAI')
  })
  
  it('handles nested response structures', () => {
    expect(extractResponseText({ content: 'Hello' })).toBe('Hello')
    expect(extractResponseText({ message: 'Hello' })).toBe('Hello')
  })
  
  it('falls back to string conversion', () => {
    expect(extractResponseText(123)).toBe('123')
    expect(extractResponseText(null)).toBe('null')
  })
})

describe('normalizeImageData', () => {
  it('returns undefined for empty array', () => {
    expect(normalizeImageData([], { supportsImages: true })).toBeUndefined()
  })
  
  it('returns undefined if provider does not support images', () => {
    const images = [{ dataUrl: 'data:image/png;base64,test' }]
    expect(normalizeImageData(images, { supportsImages: false })).toBeUndefined()
  })
  
  it('applies maxImages limit', () => {
    const images = [
      { dataUrl: 'data:image/png;base64,1' },
      { dataUrl: 'data:image/png;base64,2' },
      { dataUrl: 'data:image/png;base64,3' }
    ]
    const result = normalizeImageData(images, { 
      supportsImages: true, 
      maxImages: 2 
    })
    expect(result).toHaveLength(2)
  })
  
  it('filters invalid image data', () => {
    const images = [
      { dataUrl: 'data:image/png;base64,valid' },
      { dataUrl: 'invalid-url' },
      { dataUrl: '' }
    ]
    const result = normalizeImageData(images, { supportsImages: true })
    expect(result).toHaveLength(1)
    expect(result![0].dataUrl).toBe('data:image/png;base64,valid')
  })
})

describe('stripMarkdown', () => {
  it('removes code blocks', () => {
    const input = 'Hello ```code``` world'
    expect(stripMarkdown(input)).toBe('Hello world')
  })
  
  it('removes inline code', () => {
    const input = 'Use `code` here'
    expect(stripMarkdown(input)).toBe('Use code here')
  })
  
  it('removes headers', () => {
    const input = '# Header\n## Subheader\nText'
    expect(stripMarkdown(input)).toBe('Header\nSubheader\nText')
  })
  
  it('removes bold and italic', () => {
    const input = '**bold** and *italic*'
    expect(stripMarkdown(input)).toBe('bold and italic')
  })
  
  it('removes links but keeps text', () => {
    const input = 'Visit [Google](https://google.com)'
    expect(stripMarkdown(input)).toBe('Visit Google')
  })
})
```

**Test Framework**: Jest or Vitest  
**Mocking**: None required (pure functions)

---

### 3. Assistant Registry (Medium Priority)

**File**: `src/assistants/index.ts`  
**Risk**: Low (simple getters, but used frequently)  
**Testability**: High (pure functions, no dependencies)

**Functions to Test:**
- `getAssistantById(id: string)` - Assistant lookup
- `listAssistants()` - Assistant listing
- `getDefaultAssistant()` - Default assistant retrieval

**Test Cases:**
```typescript
describe('getAssistantById', () => {
  it('returns assistant for valid ID', () => {
    const assistant = getAssistantById('general')
    expect(assistant).toBeDefined()
    expect(assistant?.id).toBe('general')
  })
  
  it('returns undefined for invalid ID', () => {
    expect(getAssistantById('nonexistent')).toBeUndefined()
  })
  
  it('is case-sensitive', () => {
    expect(getAssistantById('General')).toBeUndefined()
  })
})

describe('listAssistants', () => {
  it('returns all assistants', () => {
    const assistants = listAssistants()
    expect(assistants.length).toBeGreaterThan(0)
    expect(assistants.every(a => a.id && a.label)).toBe(true)
  })
  
  it('returns assistants with required fields', () => {
    const assistants = listAssistants()
    assistants.forEach(assistant => {
      expect(assistant).toHaveProperty('id')
      expect(assistant).toHaveProperty('label')
      expect(assistant).toHaveProperty('intro')
      expect(assistant).toHaveProperty('promptMarkdown')
      expect(assistant).toHaveProperty('quickActions')
    })
  })
})

describe('getDefaultAssistant', () => {
  it('returns first assistant', () => {
    const defaultAssistant = getDefaultAssistant()
    const allAssistants = listAssistants()
    expect(defaultAssistant).toEqual(allAssistants[0])
  })
  
  it('always returns same assistant', () => {
    const first = getDefaultAssistant()
    const second = getDefaultAssistant()
    expect(first).toEqual(second)
  })
})
```

**Test Framework**: Jest or Vitest  
**Mocking**: None required

---

### 4. Error Handling Utilities (High Priority - When Extracted)

**File**: `src/core/utils/errorHandling.ts` (to be created)  
**Risk**: High (error messages shown to users)  
**Testability**: High (pure functions)

**Note**: This module should be created first (see refactor ticket #03). Once extracted, add comprehensive tests.

**Functions to Test:**
- `errorToString(error: unknown)` - Error message formatting

**Test Cases:**
```typescript
describe('errorToString', () => {
  it('handles ProviderError with AUTHENTICATION type', () => {
    const error = new ProviderError('Auth failed', ProviderErrorType.AUTHENTICATION)
    expect(errorToString(error)).toBe('Authentication failed. Please check your token in Settings.')
  })
  
  it('handles ProviderError with RATE_LIMIT type', () => {
    const error = new ProviderError('Rate limit', ProviderErrorType.RATE_LIMIT)
    expect(errorToString(error)).toBe('Rate limit exceeded. Please try again in a moment.')
  })
  
  it('handles ProviderError with TIMEOUT type', () => {
    const error = new ProviderError('Timeout', ProviderErrorType.TIMEOUT)
    expect(errorToString(error)).toBe('Request timeout. The server took too long to respond. Please try again.')
  })
  
  it('handles standard Error objects', () => {
    const error = new Error('Something went wrong')
    expect(errorToString(error)).toBe('Something went wrong')
  })
  
  it('handles HTTP response errors', () => {
    const error = { status: 500, statusText: 'Internal Server Error' }
    expect(errorToString(error)).toBe('HTTP 500: Internal Server Error')
  })
  
  it('handles unknown error types', () => {
    expect(errorToString('string error')).toBe('string error')
    expect(errorToString(123)).toBe('123')
    expect(errorToString(null)).toBe('null')
  })
})
```

**Test Framework**: Jest or Vitest  
**Mocking**: None required

---

## Test Setup Recommendations

### Option 1: Jest (Recommended for TypeScript)

**Installation:**
```bash
npm install --save-dev jest @types/jest ts-jest
```

**Configuration (`jest.config.js`):**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/ui.tsx'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

**Package.json script:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Option 2: Vitest (Modern Alternative)

**Installation:**
```bash
npm install --save-dev vitest
```

**Configuration (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
```

---

## Mocking Figma API

For testing modules that use `figma.clientStorage`, create a mock:

**`src/__tests__/mocks/figma.ts`:**
```typescript
export const mockFigma = {
  clientStorage: {
    getAsync: jest.fn(),
    setAsync: jest.fn(),
    deleteAsync: jest.fn()
  }
}

// Use in tests:
beforeEach(() => {
  jest.clearAllMocks()
  global.figma = mockFigma as any
})
```

---

## Test File Structure

```
src/
├── core/
│   ├── settings.ts
│   └── __tests__/
│       └── settings.test.ts
│   ├── provider/
│   │   ├── normalize.ts
│   │   └── __tests__/
│   │       └── normalize.test.ts
├── assistants/
│   ├── index.ts
│   └── __tests__/
│       └── index.test.ts
└── __tests__/
    └── mocks/
        └── figma.ts
```

---

## Implementation Priority

1. **Phase 1 (High Priority)**: 
   - Message normalization tests
   - Settings normalization tests
   - Error handling tests (after extraction)

2. **Phase 2 (Medium Priority)**:
   - Assistant registry tests
   - Additional edge case coverage

3. **Phase 3 (Low Priority)**:
   - Integration tests for utility combinations
   - Performance tests for normalization functions

---

## Coverage Goals

- **Minimum**: 80% coverage for pure utility functions
- **Target**: 90%+ coverage for critical normalization functions
- **Focus**: Edge cases and error conditions

---

## Notes

- Start with high-priority modules (normalization, error handling)
- Add tests incrementally as you refactor
- Use tests to document expected behavior
- Keep tests simple and focused on one concern
- Mock Figma API dependencies appropriately
- Don't test implementation details, test behavior

---

## Example: Complete Test File

**`src/core/provider/__tests__/normalize.test.ts`:**
```typescript
import { 
  normalizeMessages, 
  extractResponseText, 
  normalizeImageData,
  stripMarkdown 
} from '../normalize'

describe('normalizeMessages', () => {
  // ... test cases from above
})

describe('extractResponseText', () => {
  // ... test cases from above
})

// ... other test suites
```

Run tests:
```bash
npm test
```

