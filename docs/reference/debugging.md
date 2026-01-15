# Debugging System

The FigmAI plugin includes a scoped debugging system that allows you to enable/disable debug logging for specific assistants or subsystems.

---

## Overview

The debugging system provides:
- **Centralized control**: All debug logging controlled via `CONFIG.dev.debug`
- **Scoped debugging**: Enable logging for specific assistants or subsystems
- **Minimal overhead**: Fast-path checks when debugging is disabled
- **Bundle-safe**: Works in both main thread and UI thread

---

## Configuration

Debug configuration is in `src/core/config.ts`:

```typescript
dev: {
  debug: {
    // Global enable/disable for all debugging
    enabled: false,
    
    // Scoped enable (supports wildcards: 'assistant:*', 'subsystem:*')
    scopes: {
      // Assistant scopes (use assistant:<assistantId>)
      'assistant:design_critique': false,
      'assistant:content_table': false,
      'assistant:design_workshop': false,
      'assistant:discovery_copilot': false,
      'assistant:general': false,
      
      // Subsystem scopes (use subsystem:<name>)
      'subsystem:provider': false,
      'subsystem:parsing': false,
      'subsystem:canvas': false,
      'subsystem:selection': false,
      'subsystem:clipboard': false,
      
      // Global scope (always checked first)
      'global': false
    },
    
    // Log levels (when enabled, what to show)
    levels: {
      debug: true,
      info: true,
      warn: true,
      error: true  // Always enabled regardless of config
    }
  }
}
```

---

## Usage

### Basic Usage

```typescript
import { debug } from '../debug/logger'

// Get a scoped logger
const dcDebug = debug.scope('assistant:design_critique')

// Log messages
dcDebug.log('Processing request', { runId, assistantId })
dcDebug.info('Info message', { data })
dcDebug.warn('Warning message', { issue })
dcDebug.error('Error message', { error })
```

### Lazy Evaluation

For expensive debug computations, check if the scope is enabled first:

```typescript
import { debug } from '../debug/logger'

if (debug.isEnabled('assistant:design_critique')) {
  // Only compute if debugging is enabled
  const expensive = computeDebugData()
  debug.scope('assistant:design_critique').log('Expensive', expensive)
}
```

### Global Logging

```typescript
import { debug } from '../debug/logger'

// Use global scope
debug.log('Global message', { data })
debug.info('Global info')
debug.warn('Global warning')
debug.error('Global error')  // Always shown
```

---

## Scope Conventions

### Assistant Scopes

Use `assistant:<assistantId>` where `<assistantId>` matches the assistant ID from the assistant registry:

- `assistant:design_critique` - Design Critique assistant
- `assistant:content_table` - Content Table assistant
- `assistant:design_workshop` - Design Workshop assistant
- `assistant:discovery_copilot` - Discovery Copilot assistant
- `assistant:general` - General assistant

### Subsystem Scopes

Use `subsystem:<name>` for cross-cutting concerns:

- `subsystem:provider` - Provider layer (Proxy, Internal API)
- `subsystem:parsing` - JSON parsing and extraction
- `subsystem:canvas` - Canvas rendering operations
- `subsystem:selection` - Selection context building
- `subsystem:clipboard` - Clipboard operations

### Wildcards

Enable all assistants or subsystems:

```typescript
scopes: {
  'assistant:*': true,  // Enable all assistants
  'subsystem:*': true   // Enable all subsystems
}
```

---

## Examples

### Enable Only Design Critique

```typescript
dev: {
  debug: {
    enabled: true,
    scopes: {
      'assistant:design_critique': true
    }
  }
}
```

### Enable Provider + Parsing

```typescript
dev: {
  debug: {
    enabled: true,
    scopes: {
      'subsystem:provider': true,
      'subsystem:parsing': true
    }
  }
}
```

### Enable All Debugging

```typescript
dev: {
  debug: {
    enabled: true,
    scopes: {
      'global': true,
      'assistant:*': true,
      'subsystem:*': true
    }
  }
}
```

---

## Backward Compatibility

Old debug flags are still supported during migration:

- `CONFIG.dev.enableDesignCritiqueDebugLogging` → maps to `assistant:design_critique`
- `CONFIG.dev.enableClipboardDebugLogging` → maps to `subsystem:clipboard`

These will be removed after migration is complete.

---

## Performance

The logger uses fast-path checks:
1. Early return if `CONFIG.dev.debug.enabled === false`
2. Scope enablement checks are simple object property lookups
3. When disabled, logger methods are no-ops (minimal overhead)

For expensive debug computations, always use `debug.isEnabled(scope)` before computing.

---

## Log Levels

- **debug**: Detailed debugging information (default: enabled when scope is on)
- **info**: Informational messages (default: enabled when scope is on)
- **warn**: Warning messages (default: enabled when scope is on)
- **error**: Error messages (always enabled, even when debugging is off)

---

## Troubleshooting

### No logs appearing

1. Check `CONFIG.dev.debug.enabled === true`
2. Check the specific scope is enabled: `scopes['assistant:design_critique'] === true`
3. Check log level is enabled: `levels.debug === true`

### Too many logs

1. Disable wildcards: Remove `'assistant:*'` or `'subsystem:*'`
2. Enable only specific scopes you need
3. Disable specific log levels if needed

### Errors always showing

This is intentional - error logs are always enabled for debugging production issues. They use `console.error()` and will appear even when debugging is disabled.

---

## Migration Guide

When migrating existing code to use the new logger:

1. Replace `CONFIG.dev.enableXxxDebugLogging` checks with `debug.scope('scope:name')`
2. Replace `console.log('[Prefix]', ...)` with `scopeDebug.log('message', { data })`
3. For expensive computations, use `debug.isEnabled('scope:name')` guard
4. Update scope names to match conventions (`assistant:<id>`, `subsystem:<name>`)

---

## See Also

- [Configuration Reference](configuration.md) - Full configuration documentation
- [Getting Started](01-getting-started.md) - Architecture overview
