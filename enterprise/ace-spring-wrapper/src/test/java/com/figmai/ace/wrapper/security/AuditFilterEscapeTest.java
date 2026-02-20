package com.figmai.ace.wrapper.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for AuditFilter.escapeJson — ensures all control chars are properly escaped.
 */
class AuditFilterEscapeTest {

    @Test
    void nullReturnsEmpty() {
        assertEquals("", AuditFilter.escapeJson(null));
    }

    @Test
    void plainStringUnchanged() {
        assertEquals("hello world", AuditFilter.escapeJson("hello world"));
    }

    @Test
    void escapesQuotesAndBackslash() {
        assertEquals("a\\\"b\\\\c", AuditFilter.escapeJson("a\"b\\c"));
    }

    @Test
    void escapesNewlineAndCarriageReturn() {
        assertEquals("line1\\nline2\\rline3", AuditFilter.escapeJson("line1\nline2\rline3"));
    }

    @Test
    void escapesTabBackspaceFormfeed() {
        assertEquals("a\\tb\\bc\\f", AuditFilter.escapeJson("a\tb\bc\f"));
    }

    @Test
    void escapesControlCharsAsUnicode() {
        assertEquals("\\u0000", AuditFilter.escapeJson("\u0000"));
        assertEquals("\\u0001", AuditFilter.escapeJson("\u0001"));
        assertEquals("\\u001f", AuditFilter.escapeJson("\u001F"));
    }

    @Test
    void mixedContent() {
        String input = "user\t\"admin\"\npath=/api/\u0000model";
        String expected = "user\\t\\\"admin\\\"\\npath=/api/\\u0000model";
        assertEquals(expected, AuditFilter.escapeJson(input));
    }
}
