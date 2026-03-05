#!/usr/bin/env node

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.ADMIN_EDITOR_PORT || 3334)
const HOST = process.env.ADMIN_EDITOR_HOST || '127.0.0.1'
const API_BASE = (process.env.ACE_API_URL || '').trim()
const API_TOKEN = (process.env.ACE_API_TOKEN || '').trim()

if (!API_BASE) {
  console.error('[admin:proxy] ACE_API_URL is required')
  process.exit(1)
}
if (!API_TOKEN) {
  console.error('[admin:proxy] ACE_API_TOKEN is required')
  process.exit(1)
}

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '')
}

const apiBase = normalizeBase(API_BASE)
const app = express()
const publicDir = path.join(__dirname, 'public')

app.use(express.json({ limit: '10mb' }))

app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${apiBase}${req.originalUrl}`
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value !== 'string') continue
      if (key.toLowerCase() === 'host') continue
      if (key.toLowerCase() === 'cookie') continue
      headers.set(key, value)
    }
    headers.set('Authorization', `Bearer ${API_TOKEN}`)

    const init: RequestInit = {
      method: req.method,
      headers
    }
    if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : req.body
      if (body) {
        init.body = body
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json')
        }
      }
    }

    const upstream = await fetch(targetUrl, init)
    res.status(upstream.status)
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return
      res.setHeader(key, value)
    })
    const bytes = await upstream.arrayBuffer()
    res.send(Buffer.from(bytes))
  } catch (error) {
    res.status(502).json({
      error: 'Proxy request failed',
      detail: error instanceof Error ? error.message : String(error)
    })
  }
})

app.use(express.static(publicDir))
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(PORT, HOST, () => {
  console.log(`[admin:proxy] Serving ACE static UI at http://${HOST}:${PORT}`)
  console.log(`[admin:proxy] Proxying /api/* -> ${apiBase}`)
})

