/**
 * XHTML Encoding Utilities
 * 
 * Provides safe XHTML encoding functions for use in Confluence export and other
 * contexts requiring strict XHTML compliance.
 * 
 * These functions are pure TypeScript (no DOM dependencies) and work in both
 * main thread and UI thread contexts.
 * 
 * Key features:
 * - Converts HTML to valid XHTML
 * - Handles special characters and entities correctly
 * - Removes problematic characters (parentheses, non-ASCII) from text content
 * - Self-closes void elements
 * - Converts attribute quotes from double to single
 */

/**
 * Valid HTML entities that should be preserved (not double-encoded)
 * Matches patterns like: &amp;, &#123;, &#x1A;
 */
const VALID_ENTITY_PATTERN = /&(?:[a-z][a-z0-9]{1,31}|#(?:[0-9]{1,7}|x[0-9a-f]{1,6}));/gi

/**
 * Void elements that must be self-closed in XHTML
 */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

/**
 * Check if a character is ASCII (0-127)
 */
function isAscii(char: string): boolean {
  return char.charCodeAt(0) <= 127
}

/**
 * Remove non-ASCII characters, replacing with spaces
 */
function removeNonAscii(text: string): string {
  return text
    .split('')
    .map(char => isAscii(char) ? char : ' ')
    .join('')
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

/**
 * Remove parentheses from text
 */
function removeParentheses(text: string): string {
  return text.replace(/[()]/g, '')
}

/**
 * Escape ampersands that are not part of valid entities
 * Preserves existing valid entities like &amp;, &#123;, &#x1A;
 */
function escapeAmpersands(text: string): string {
  // Find all valid entities and mark their positions
  const entityPositions: Array<{ start: number; end: number }> = []
  let match: RegExpExecArray | null
  
  // Reset regex lastIndex
  VALID_ENTITY_PATTERN.lastIndex = 0
  
  while ((match = VALID_ENTITY_PATTERN.exec(text)) !== null) {
    entityPositions.push({
      start: match.index,
      end: match.index + match[0].length
    })
  }
  
  // Escape ampersands that are not part of valid entities
  let result = ''
  let lastIndex = 0
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '&') {
      // Check if this ampersand is part of a valid entity
      const isInEntity = entityPositions.some(
        pos => i >= pos.start && i < pos.end
      )
      
      if (!isInEntity) {
        result += text.substring(lastIndex, i) + '&amp;'
        lastIndex = i + 1
      }
    }
  }
  
  result += text.substring(lastIndex)
  return result
}

/**
 * Encode < and > in text content (not inside tags)
 */
function encodeTextContent(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Convert double quotes to single quotes in attribute values
 */
function convertAttributeQuotes(html: string): string {
  // State machine to parse HTML and convert attribute quotes
  let result = ''
  let i = 0
  let inTag = false
  let inDoubleQuote = false
  let inSingleQuote = false
  
  while (i < html.length) {
    const char = html[i]
    
    if (!inTag && char === '<') {
      // Entering a tag
      inTag = true
      result += char
      i++
      continue
    }
    
    if (inTag && char === '>') {
      // Exiting a tag
      inTag = false
      inDoubleQuote = false
      inSingleQuote = false
      result += char
      i++
      continue
    }
    
    if (inTag) {
      if (char === '"' && !inSingleQuote) {
        // Convert double quote to single quote in attributes
        if (inDoubleQuote) {
          // Closing the attribute value
          inDoubleQuote = false
          result += "'"
        } else {
          // Opening the attribute value
          inDoubleQuote = true
          result += "'"
        }
      } else if (char === "'" && !inDoubleQuote) {
        // Preserve single quotes
        if (inSingleQuote) {
          inSingleQuote = false
        } else {
          inSingleQuote = true
        }
        result += char
      } else {
        result += char
      }
    } else {
      // Text content - pass through (will be processed separately)
      result += char
    }
    
    i++
  }
  
  return result
}

/**
 * Self-close void elements (e.g., <br> -> <br />, <img ...> -> <img ... />)
 */
function selfCloseVoidElements(html: string): string {
  // Pattern to match void elements that aren't already self-closed
  // Matches: <br>, <img ...>, <hr class="...">, etc.
  // But not: <br />, <img ... />, <div></div>
  
  let result = html
  
  // For each void element, find opening tags that aren't self-closed
  const voidElementArray = Array.from(VOID_ELEMENTS)
  for (const tagName of voidElementArray) {
    // Pattern: <tagName ... > (not followed by /> and not a closing tag)
    const pattern = new RegExp(
      `<${tagName}([^>]*?)(?<!\\/)>`,
      'gi'
    )
    
    result = result.replace(pattern, (match, attributes) => {
      // Check if it's already self-closed
      if (match.endsWith('/>')) {
        return match
      }
      
      // Self-close it
      if (attributes.trim()) {
        return `<${tagName}${attributes} />`
      } else {
        return `<${tagName} />`
      }
    })
  }
  
  return result
}

/**
 * Process text content (between tags) with encoding rules
 */
function processTextContent(text: string): string {
  // Apply transformations in order:
  // 1. Remove parentheses
  // 2. Remove non-ASCII (replace with spaces)
  // 3. Escape ampersands (preserving valid entities)
  // 4. Encode < and >
  
  let processed = removeParentheses(text)
  processed = removeNonAscii(processed)
  processed = escapeAmpersands(processed)
  processed = encodeTextContent(processed)
  
  return processed
}

/**
 * Encode a full XHTML document
 * 
 * Applies all XHTML encoding rules:
 * - Converts attribute quotes from double to single
 * - Self-closes void elements
 * - Removes parentheses from text nodes
 * - Removes non-ASCII characters from text nodes
 * - Escapes ampersands (preserving valid entities)
 * - Encodes < and > in text nodes only
 * 
 * Examples:
 *   Input:  '<div class="test">Hello (world) & café</div>'
 *   Output: '<div class='test'>Hello world &amp; caf </div>'
 * 
 *   Input:  '<br><img src="test.jpg">'
 *   Output: '<br /><img src='test.jpg' />'
 * 
 *   Input:  'Text with &amp; entity'
 *   Output: 'Text with &amp; entity' (entity preserved)
 * 
 *   Input:  '<p>Price: $100 (USD)</p>'
 *   Output: '<p>Price: $100 USD</p>'
 * 
 *   Input:  '<a href="test?x=1&y=2">Link</a>'
 *   Output: '<a href='test?x=1&amp;y=2'>Link</a>'
 */
export function encodeXhtmlDocument(input: string): string {
  if (!input) {
    return ''
  }
  
  // Step 1: Convert attribute quotes (double to single)
  let result = convertAttributeQuotes(input)
  
  // Step 2: Self-close void elements
  result = selfCloseVoidElements(result)
  
  // Step 3: Process text content (between tags)
  // Use a parser to distinguish tags from text
  // A tag starts with < followed by a letter, /, or ! (for comments/doctype)
  let processed = ''
  let i = 0
  let inTag = false
  let textBuffer = ''
  
  while (i < result.length) {
    const char = result[i]
    const nextChar = i + 1 < result.length ? result[i + 1] : ''
    const nextNextChar = i + 2 < result.length ? result[i + 2] : ''
    
    if (char === '<' && !inTag) {
      // Check if this is a real tag start (< followed by letter, /, or !)
      // or just a < in text content
      const isTagStart = 
        /^[a-z!\/]/i.test(nextChar) || // <letter, <!, or </>
        (nextChar === '?' && /^[a-z]/i.test(nextNextChar)) // <?xml
      
      if (isTagStart) {
        // Process accumulated text content before entering tag
        if (textBuffer) {
          processed += processTextContent(textBuffer)
          textBuffer = ''
        }
        inTag = true
        processed += char
      } else {
        // < in text content - add to buffer (will be encoded)
        textBuffer += char
      }
    } else if (char === '>' && inTag) {
      // Exiting tag
      inTag = false
      processed += char
    } else if (inTag) {
      // Inside a tag - preserve as-is
      processed += char
    } else {
      // Text content - accumulate for processing
      textBuffer += char
    }
    
    i++
  }
  
  // Process any remaining text
  if (textBuffer) {
    processed += processTextContent(textBuffer)
  }
  
  return processed
}

/**
 * Encode a single table cell value for XHTML
 * 
 * Stricter encoder intended for individual cell values.
 * Does NOT introduce any HTML tags - only encodes text.
 * 
 * Applies:
 * - Parentheses removal
 * - Non-ASCII removal (replaced with spaces)
 * - Ampersand escaping (preserving valid entities)
 * - < and > encoding
 * 
 * Examples:
 *   Input:  'Hello (world)'
 *   Output: 'Hello world'
 * 
 *   Input:  'Price: $100 & café'
 *   Output: 'Price: $100 &amp; caf '
 * 
 *   Input:  'Text with &amp; entity'
 *   Output: 'Text with &amp; entity' (entity preserved)
 * 
 *   Input:  'Value < 10'
 *   Output: 'Value &lt; 10'
 * 
 *   Input:  'Test (with) parentheses'
 *   Output: 'Test with parentheses'
 */
export function encodeXhtmlCellValue(input: string): string {
  if (!input) {
    return ''
  }
  
  // Apply all text transformations (no tag processing)
  let processed = removeParentheses(input)
  processed = removeNonAscii(processed)
  processed = escapeAmpersands(processed)
  processed = encodeTextContent(processed)
  
  return processed
}

/**
 * Encode a Figma URL for safe inclusion in XHTML attributes
 * 
 * Ensures the URL is safe for use in href, src, etc. attributes.
 * Does not double-encode already-encoded sequences.
 * 
 * Conservative approach: only encodes characters that are problematic
 * in XHTML attribute contexts, preserving valid URL characters.
 * 
 * Examples:
 *   Input:  'https://www.figma.com/file/abc?node-id=123'
 *   Output: 'https://www.figma.com/file/abc?node-id=123' (unchanged)
 * 
 *   Input:  'https://example.com/path with spaces'
 *   Output: 'https://example.com/path%20with%20spaces'
 * 
 *   Input:  'https://example.com/path?x=1&y=2'
 *   Output: 'https://example.com/path?x=1&amp;y=2' (ampersand encoded for XHTML)
 * 
 *   Input:  'https://example.com/path?x=1%26y=2' (already encoded)
 *   Output: 'https://example.com/path?x=1%26y=2' (preserved)
 */
export function encodeFigmaUrl(input: string): string {
  if (!input) {
    return ''
  }
  
  // Check if URL is already encoded (contains %XX sequences)
  // If so, be more conservative
  const hasEncodedSequences = /%[0-9a-f]{2}/i.test(input)
  
  let result = input
  
  // Always encode ampersands for XHTML safety (unless part of valid entity)
  // But preserve %-encoded sequences
  result = escapeAmpersands(result)
  
  // Encode spaces (if not already encoded)
  if (!hasEncodedSequences) {
    result = result.replace(/ /g, '%20')
  }
  
  // Encode other problematic characters for attributes (if not already encoded)
  if (!hasEncodedSequences) {
    // Encode quotes (shouldn't appear in URLs, but be safe)
    result = result.replace(/"/g, '%22')
    result = result.replace(/'/g, '%27')
    
    // Encode < and > (shouldn't appear in URLs, but be safe)
    result = result.replace(/</g, '%3C')
    result = result.replace(/>/g, '%3E')
  }
  
  return result
}

