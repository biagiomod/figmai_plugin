# Open Sans font files

Place font files here. They are base64-embedded into the exported HTML prototype
at build time — no CDN required. The build script auto-detects what's available.

## Option A — Variable font (recommended)

One file covers all weights. The script checks for these names (woff2 preferred):

```
OpenSans-VariableFont.woff2          ← best: smallest file
OpenSans-VariableFont.ttf            ← accepted: larger but works
OpenSans[wdth,wght].woff2 / .ttf
OpenSans[wght].woff2 / .ttf
OpenSans-VariableFont_wdth,wght.woff2 / .ttf   (Google Fonts zip name)
OpenSans-VariableFont_wght.woff2 / .ttf
```

## Option B — Static per-weight files

| File (woff2 preferred, ttf accepted) | Weight |
|---|---|
| `OpenSans-Light.woff2` / `.ttf` | 300 |
| `OpenSans-Regular.woff2` / `.ttf` | 400 |
| `OpenSans-SemiBold.woff2` / `.ttf` | 600 |
| `OpenSans-Bold.woff2` / `.ttf` | 700 |
| `OpenSans-ExtraBold.woff2` / `.ttf` | 800 |

## Format size guide (approximate base64 impact on plugin bundle)

| Format | ~Size | ~Base64 |
|---|---|---|
| Variable woff2 (1 file) | 100 KB | +135 KB ✅ |
| Static woff2 (5 files) | 90 KB | +120 KB ✅ |
| Variable ttf (1 file) | 500 KB | +680 KB ⚠️ |
| Static ttf (5 files) | 1 MB | +1.4 MB ⚠️ |

## What happens if files are missing

The build succeeds with a warning. Missing weights are skipped.
If no files are found, the exported HTML uses the system font stack
(`"Helvetica Neue", helvetica, arial, sans-serif`) — no external calls.
