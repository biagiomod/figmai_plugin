/**
 * Tests for isTlsError helper.
 * Run: npx tsx admin-editor/src/tls-errors.test.ts
 */

import assert from 'node:assert'
import { isTlsError } from './tls-errors'

function test_detectsFromErrCode() {
  assert.strictEqual(isTlsError({ code: 'SELF_SIGNED_CERT_IN_CHAIN' }), true, 'err.code SELF_SIGNED_CERT_IN_CHAIN')
  assert.strictEqual(isTlsError({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }), true, 'err.code UNABLE_TO_VERIFY_LEAF_SIGNATURE')
  assert.strictEqual(isTlsError({ code: 'CERT_UNTRUSTED' }), true, 'err.code CERT_UNTRUSTED')
  assert.strictEqual(isTlsError({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' }), true, 'err.code ERR_TLS_CERT_ALTNAME_INVALID')
}

function test_detectsFromErrMessage() {
  assert.strictEqual(isTlsError({ message: 'unable to get local issuer certificate' }), true, 'err.message issuer')
  assert.strictEqual(isTlsError({ message: 'certificate verify failed' }), true, 'err.message verify failed')
  assert.strictEqual(isTlsError({ message: 'self signed certificate in chain' }), true, 'err.message self signed')
  assert.strictEqual(isTlsError({ message: 'certificate has expired' }), true, 'err.message expired')
}

function test_detectsFromCauseCode() {
  const err = { message: 'fetch failed', cause: { code: 'SELF_SIGNED_CERT_IN_CHAIN' } }
  assert.strictEqual(isTlsError(err), true, 'err.cause.code SELF_SIGNED_CERT_IN_CHAIN')

  const err2 = { message: 'fetch failed', cause: { code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' } }
  assert.strictEqual(isTlsError(err2), true, 'err.cause.code UNABLE_TO_GET_ISSUER_CERT_LOCALLY')
}

function test_detectsFromCauseMessage() {
  const err = { message: 'fetch failed', cause: { message: 'self signed certificate in chain' } }
  assert.strictEqual(isTlsError(err), true, 'err.cause.message self signed')

  const err2 = { message: 'fetch failed', cause: { message: 'unable to get local issuer certificate' } }
  assert.strictEqual(isTlsError(err2), true, 'err.cause.message issuer')
}

function test_returnsFalseForNonTlsErrors() {
  assert.strictEqual(isTlsError({ code: 'ECONNREFUSED', message: 'Connection refused' }), false, 'ECONNREFUSED')
  assert.strictEqual(isTlsError({ name: 'TimeoutError', message: 'Request timed out' }), false, 'timeout')
  assert.strictEqual(isTlsError({ message: 'fetch failed' }), false, 'bare fetch failed')
}

function test_returnsFalseForNullish() {
  assert.strictEqual(isTlsError(null), false, 'null')
  assert.strictEqual(isTlsError(undefined), false, 'undefined')
  assert.strictEqual(isTlsError('some string'), false, 'string')
}

test_detectsFromErrCode()
test_detectsFromErrMessage()
test_detectsFromCauseCode()
test_detectsFromCauseMessage()
test_returnsFalseForNonTlsErrors()
test_returnsFalseForNullish()

console.log('tls-errors: all tests passed')
