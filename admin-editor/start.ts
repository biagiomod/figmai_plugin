/**
 * ACE startup wrapper.
 * Sets NODE_EXTRA_CA_CERTS if a corporate CA cert is found at
 * admin-editor/certs/corp-ca.pem, then spawns server.ts so that
 * Node honours the cert from process launch (required — env var is read
 * at startup, not lazily).
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const certPath = path.join(__dirname, 'certs', 'corp-ca.pem')
const childEnv: NodeJS.ProcessEnv = { ...process.env }

if (fs.existsSync(certPath)) {
  childEnv.NODE_EXTRA_CA_CERTS = certPath
  console.log(`[ACE] Corporate CA cert found at ${certPath} — setting NODE_EXTRA_CA_CERTS`)
} else if (process.env.NODE_ENV !== 'production') {
  console.log('[ACE] Tip: for corporate/internal HTTPS endpoints, place your CA cert at admin-editor/certs/corp-ca.pem')
}

const serverScript = path.join(__dirname, 'server.ts')
const child = spawn(
  'npx', ['tsx', serverScript],
  {
    env: childEnv,
    stdio: 'inherit',
    shell: false,
  }
)

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    child.kill(sig)
  })
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})
