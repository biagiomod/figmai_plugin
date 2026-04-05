/**
 * TLS error detection helper for ACE server.
 * Pure function — no imports, no side effects.
 */

const TLS_PATTERNS = [
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_UNTRUSTED',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'unable to get local issuer certificate',
  'certificate has expired',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'self signed certificate',
  'certificate verify failed',
]

/**
 * Returns true when err (or its cause) carries a TLS trust/verification failure.
 * Node's native fetch (undici) wraps TLS errors in err.cause, so we inspect
 * err.code, err.message, err.cause.code, and err.cause.message.
 */
export function isTlsError(err: unknown): boolean {
  const candidates = [
    (err as any)?.code,
    (err as any)?.message,
    (err as any)?.cause?.code,
    (err as any)?.cause?.message,
  ]
  return candidates.some(
    (s) => typeof s === 'string' && TLS_PATTERNS.some((p) => s.includes(p))
  )
}
