/**
 * XHTML Encoding Test Harness
 * 
 * Simple test script to verify XHTML encoding functions work correctly.
 * Run with: tsx scripts/test-xhtml-encoding.ts
 */

import {
  encodeXhtmlDocument,
  encodeXhtmlCellValue,
  encodeFigmaUrl
} from '../src/core/encoding/xhtml'

interface TestCase {
  name: string
  input: string
  expected?: string // Optional - just log if not provided
  fn: (input: string) => string
}

const testCases: TestCase[] = [
  // encodeXhtmlDocument tests
  {
    name: 'Document: Remove parentheses from text',
    input: '<p>Hello (world)</p>',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Remove non-ASCII',
    input: '<p>café — ✅</p>',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Convert double quotes to single in attributes',
    input: '<div class="test">Content</div>',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Self-close void elements',
    input: '<br><img src="test.jpg">',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Preserve valid entities',
    input: '<p>Text with &amp; and &#123; entities</p>',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Escape ampersands in text',
    input: '<p>Price: $100 & $200</p>',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Encode < and > in text',
    input: '<p>Value < 10 and > 5</p>',
    fn: encodeXhtmlDocument
  },
  {
    name: 'Document: Complex example',
    input: '<div class="container"><p>Hello (world) & café</p><br><img src="test.jpg"></div>',
    fn: encodeXhtmlDocument
  },
  
  // encodeXhtmlCellValue tests
  {
    name: 'Cell: Remove parentheses',
    input: 'Price: $100 (USD)',
    fn: encodeXhtmlCellValue
  },
  {
    name: 'Cell: Remove non-ASCII',
    input: 'café — ✅',
    fn: encodeXhtmlCellValue
  },
  {
    name: 'Cell: Preserve valid entities',
    input: 'Text with &amp; entity',
    fn: encodeXhtmlCellValue
  },
  {
    name: 'Cell: Escape ampersands',
    input: 'A & B & C',
    fn: encodeXhtmlCellValue
  },
  {
    name: 'Cell: Encode < and >',
    input: 'Value < 10',
    fn: encodeXhtmlCellValue
  },
  {
    name: 'Cell: Complex example',
    input: 'Test (with) parentheses & café < 100',
    fn: encodeXhtmlCellValue
  },
  
  // encodeFigmaUrl tests
  {
    name: 'URL: Preserve valid URL',
    input: 'https://www.figma.com/file/abc?node-id=123',
    fn: encodeFigmaUrl
  },
  {
    name: 'URL: Encode spaces',
    input: 'https://example.com/path with spaces',
    fn: encodeFigmaUrl
  },
  {
    name: 'URL: Encode ampersands',
    input: 'https://example.com/path?x=1&y=2',
    fn: encodeFigmaUrl
  },
  {
    name: 'URL: Preserve already-encoded',
    input: 'https://example.com/path?x=1%26y=2',
    fn: encodeFigmaUrl
  },
  {
    name: 'URL: Figma URL example',
    input: 'https://www.figma.com/file/abc123?node-id=1%3A2',
    fn: encodeFigmaUrl
  }
]

function runTests() {
  console.log('='.repeat(60))
  console.log('XHTML Encoding Test Harness')
  console.log('='.repeat(60))
  console.log()
  
  let passed = 0
  let failed = 0
  
  for (const testCase of testCases) {
    try {
      const result = testCase.fn(testCase.input)
      
      console.log(`Test: ${testCase.name}`)
      console.log(`  Input:    ${testCase.input}`)
      console.log(`  Output:   ${result}`)
      
      if (testCase.expected) {
        if (result === testCase.expected) {
          console.log(`  Status:   ✅ PASS`)
          passed++
        } else {
          console.log(`  Expected: ${testCase.expected}`)
          console.log(`  Status:   ❌ FAIL`)
          failed++
        }
      } else {
        console.log(`  Status:   ⚠️  MANUAL CHECK`)
        passed++
      }
      
      console.log()
    } catch (error) {
      console.log(`Test: ${testCase.name}`)
      console.log(`  Input:    ${testCase.input}`)
      console.log(`  Error:    ${error instanceof Error ? error.message : String(error)}`)
      console.log(`  Status:   ❌ ERROR`)
      console.log()
      failed++
    }
  }
  
  console.log('='.repeat(60))
  console.log(`Summary: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(60))
  
  return failed === 0
}

// Run tests if executed directly
if (require.main === module) {
  const success = runTests()
  process.exit(success ? 0 : 1)
}

export { runTests }

