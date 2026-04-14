/**
 * clipboardService.ts — Multi-strategy clipboard operations for table data.
 *
 * Implements a four-strategy chain for copying HTML/TSV/JSON to clipboard:
 *   A: ClipboardItem API (HTML + plain text MIME types)
 *   B: execCommand with contentEditable div (HTML)
 *   C: navigator.clipboard.writeText (plain text)
 *   D: textarea + execCommand (final fallback)
 */

export interface ClipboardResult {
  success: boolean
  message: string
  strategy?: string
}

/**
 * Copy HTML table content to clipboard using multi-strategy chain.
 * Returns result indicating success/failure and which strategy was used.
 */
export async function copyHtmlToClipboard(
  html: string,
  plainText: string
): Promise<ClipboardResult> {
  // Strategy A: ClipboardItem with both HTML and plain text MIME types
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([plainText], { type: 'text/plain' })
      const clipboardItem = new ClipboardItem({
        'text/html': Promise.resolve(htmlBlob),
        'text/plain': Promise.resolve(textBlob)
      })
      await navigator.clipboard.write([clipboardItem])
      return { success: true, message: 'Table copied to clipboard (HTML)', strategy: 'A' }
    } catch (e) {
      console.warn('[Clipboard] Strategy A failed:', (e as Error).message)
    }
  }

  // Strategy B: execCommand with contentEditable div for HTML
  try {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    div.style.position = 'fixed'
    div.style.left = '-9999px'
    div.style.top = '0'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    div.style.zIndex = '-1'
    div.innerHTML = html
    document.body.appendChild(div)
    await new Promise(resolve => setTimeout(resolve, 10))
    const range = document.createRange()
    range.selectNodeContents(div)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
    div.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    const successful = document.execCommand('copy')
    if (selection) selection.removeAllRanges()
    document.body.removeChild(div)
    if (successful) {
      return { success: true, message: 'Table copied to clipboard', strategy: 'B' }
    }
  } catch (e) {
    console.warn('[Clipboard] Strategy B failed:', (e as Error).message)
  }

  // Strategy C: writeText with plain text
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(plainText)
      return { success: true, message: 'Table copied to clipboard (plain text)', strategy: 'C' }
    } catch (e) {
      console.warn('[Clipboard] Strategy C failed:', (e as Error).message)
    }
  }

  // Strategy D: textarea + execCommand (final fallback)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = plainText
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '0'
    textArea.style.width = '1px'
    textArea.style.height = '1px'
    textArea.style.opacity = '0'
    textArea.style.pointerEvents = 'none'
    textArea.style.zIndex = '-1'
    document.body.appendChild(textArea)
    await new Promise(resolve => setTimeout(resolve, 10))
    textArea.focus()
    textArea.select()
    await new Promise(resolve => setTimeout(resolve, 10))
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    if (successful) {
      return { success: true, message: 'Table copied (plain text)', strategy: 'D' }
    }
  } catch (e) {
    console.warn('[Clipboard] Strategy D failed:', (e as Error).message)
  }

  return { success: false, message: 'Copy failed: All methods failed.' }
}

/**
 * Copy plain text (TSV, JSON, etc.) to clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<ClipboardResult> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return { success: true, message: 'Copied to clipboard' }
    } catch (e) {
      console.warn('[Clipboard] writeText failed:', (e as Error).message)
    }
  }

  // Fallback to execCommand
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    if (successful) {
      return { success: true, message: 'Copied to clipboard' }
    }
  } catch (e) {
    console.warn('[Clipboard] execCommand fallback failed:', (e as Error).message)
  }

  return { success: false, message: 'Copy failed: All methods failed.' }
}

/**
 * Copy an image (PNG data URL) to clipboard with multi-strategy fallback.
 * Returns a download fallback filename if clipboard write is not permitted.
 */
export async function copyImageToClipboard(
  dataUrl: string,
  fallbackFilename: string
): Promise<ClipboardResult & { downloaded?: boolean }> {
  try {
    const base64Match = dataUrl.match(/^data:image\/png;base64,(.+)$/)
    if (!base64Match) {
      return { success: false, message: 'Invalid data URL format' }
    }

    const base64String = base64Match[1]
    const binaryString = atob(base64String)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/png' })

    // Primary: ClipboardItem API
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        return { success: true, message: 'Image copied to clipboard' }
      } catch (e) {
        console.warn('[Clipboard] Image primary write failed:', (e as Error).message)
      }
    }

    // Fallback A: Canvas redraw then clipboard
    try {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          resolve()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = dataUrl
      })
      const canvasBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Canvas toBlob failed'))
        }, 'image/png')
      })
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': canvasBlob })
        ])
        return { success: true, message: 'Image copied to clipboard' }
      }
    } catch (e) {
      console.warn('[Clipboard] Image fallback A failed:', (e as Error).message)
    }

    // Fallback B: Download
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fallbackFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return {
      success: false,
      message: 'Clipboard write not permitted. Image downloaded instead.',
      downloaded: true
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: `Could not copy image: ${errorMessage}` }
  }
}
