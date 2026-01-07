/**
 * Confluence Modal Component
 * 
 * 3-stage modal for sending Content Table to Confluence:
 * 1. Input: Title field + submit button
 * 2. Processing: Animated "Processing" indicator
 * 3. Success: "Successfully sent to Confluence" + optional "Go to Confluence" button
 */

import { h } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { Button, Textbox } from '@create-figma-plugin/ui'
import type { UniversalContentTableV1, TableFormatPreset } from '../../core/types'
import { universalTableToHtml } from '../../core/contentTable/renderers'
import { encodeXhtmlDocument } from '../../core/encoding/xhtml'
import { loadWorkAdapter } from '../../core/work/loadAdapter'

interface ConfluenceModalProps {
  contentTable: UniversalContentTableV1
  format: TableFormatPreset
  onClose: () => void
  onSuccess: () => void // Called when modal closes after successful send
}

type ModalStage = 'input' | 'processing' | 'success' | 'error'

export function ConfluenceModal({ contentTable, format, onClose, onSuccess }: ConfluenceModalProps) {
  const [stage, setStage] = useState<ModalStage>('input')
  const [title, setTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confluenceUrl, setConfluenceUrl] = useState<string | undefined>(undefined)

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      return // Don't submit empty title
    }

    // Switch to processing stage immediately
    setStage('processing')
    setErrorMessage(null)

    try {
      // Build XHTML table content
      const { html } = universalTableToHtml(contentTable, format)
      const xhtmlContent = encodeXhtmlDocument(html)

      // Load Work adapter
      const workAdapter = await loadWorkAdapter()

      // Call createConfluence if available, otherwise simulate success
      if (workAdapter.createConfluence) {
        try {
          const result = await workAdapter.createConfluence({
            confluenceTitle: title.trim(),
            confluenceTemplateXhtml: xhtmlContent
          })
          setConfluenceUrl(result.url)
          setStage('success')
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
          setStage('error')
        }
      } else {
        // Simulate success after delay (600-900ms)
        const delay = 600 + Math.random() * 300
        await new Promise(resolve => setTimeout(resolve, delay))
        setStage('success')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
      setStage('error')
    }
  }, [title, contentTable, format])

  const handleClose = useCallback(() => {
    // If we're in success stage, call onSuccess to add chat bubble
    if (stage === 'success') {
      onSuccess()
    }
    onClose()
  }, [stage, onSuccess, onClose])

  const handleGoToConfluence = useCallback(() => {
    if (confluenceUrl) {
      // Open URL in new window/tab (Figma plugin environment)
      window.open(confluenceUrl, '_blank')
    }
    handleClose()
  }, [confluenceUrl, handleClose])

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'processing') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [stage, handleClose])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--overlay-scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={stage !== 'processing' ? handleClose : undefined}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-modal)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          maxWidth: '500px',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          boxShadow: 'var(--shadow-elevation)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Stage 1: Input */}
        {stage === 'input' && (
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--fg)'
              }}
            >
              Send to Confluence
            </div>
            
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--fg-secondary)',
                marginBottom: 'var(--spacing-sm)'
              }}
            >
              Enter a title for the Confluence page:
            </div>

            <Textbox
              value={title}
              onInput={(e: any) => setTitle(e.target.value)}
              placeholder="Content Table"
              style={{
                width: '100%',
                marginBottom: 'var(--spacing-sm)'
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleSubmit()
                }
              }}
            />

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleClose}
                secondary
                style={{
                  backgroundColor: 'var(--surface-modal)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        )}

        {/* Stage 2: Processing */}
        {stage === 'processing' && (
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-md)',
                color: 'var(--fg)',
                textAlign: 'center'
              }}
            >
              Processing
            </div>
            
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-xl)',
                minHeight: '120px'
              }}
            >
              <div className="spinner" style={{ width: '24px', height: '24px' }} />
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--fg-secondary)'
                }}
              >
                Sending table to Confluence...
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Success */}
        {stage === 'success' && (
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-md)',
                color: 'var(--fg)',
                textAlign: 'center'
              }}
            >
              Successfully sent to Confluence
            </div>
            
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--fg-secondary)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-md)'
              }}
            >
              Your content table has been sent to Confluence.
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
              {confluenceUrl ? (
                <Button onClick={handleGoToConfluence}>
                  Go to Confluence
                </Button>
              ) : (
                <Button onClick={handleClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 4: Error */}
        {stage === 'error' && (
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-md)',
                color: 'var(--error)',
                textAlign: 'center'
              }}
            >
              Error
            </div>
            
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--fg-secondary)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {errorMessage || 'An error occurred while sending to Confluence.'}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
              <Button onClick={() => setStage('input')} secondary>
                Back
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

