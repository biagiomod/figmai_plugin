# Content Table Ignore Rules

Nodes matching these rules are excluded **before** scanning and semantic tokenization.
Edit this file to tune EG-A for your team's design system shell and shared chrome.

Prefer component keys (stable) over node names (fragile).
Prefer node names over text patterns (avoid over-ignoring real copy).

## Notes

- These rules run in the plugin at scan time, before content reaches the content table.
- Changes take effect after `npm run build`.
- Use regex patterns prefixed with `(?i)` for case-insensitive matching.

## Component Key Denylist

(Paste stable component keys for shared nav, rails, headers, footers here)
(Example: abc123globalnavkey)

## Node Name Patterns

(?i)^top\s+nav(?:igation)?$
(?i)^global\s+header$
(?i)^left\s+rail$
(?i)^side\s+rail$
(?i)^sidebar$
(?i)^app\s+shell$
(?i)^persistent\s+header$
(?i)^persistent\s+footer$
(?i)^global\s+footer$

## Text Value Patterns

(?i)^skip\s+to\s+(?:main\s+)?content$

## Node ID Prefixes

(Node ID prefixes to ignore — avoid unless necessary, IDs are file-specific)
