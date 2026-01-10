/**
 * Discovery Copilot Extraction
 * Extracts structured information from conversation messages
 */

import type { NormalizedMessage } from '../provider/provider'
import type { DiscoverySpecV1, DocumentStatus } from './types'

/**
 * Extracted discovery data (allows partial problemFrame)
 */
export interface ExtractedDiscoveryData {
  problemFrame?: Partial<DiscoverySpecV1['problemFrame']>
  risksAndAssumptions?: DiscoverySpecV1['risksAndAssumptions']
  hypothesesAndExperiments?: DiscoverySpecV1['hypothesesAndExperiments']
  decisionLog?: DiscoverySpecV1['decisionLog']
  asyncTasks?: DiscoverySpecV1['asyncTasks']
  meta?: Partial<DiscoverySpecV1['meta']>
}

/**
 * Extract Problem Frame information from conversation
 */
export function extractProblemFrame(messages: NormalizedMessage[]): Partial<DiscoverySpecV1['problemFrame']> {
  const result: Partial<DiscoverySpecV1['problemFrame']> = {}
  
  // Track which question was asked last to match answers
  let lastQuestion: 'what' | 'who' | 'why' | 'success' | null = null
  
  // Process messages in order to track question-answer pairs
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const content = msg.content
    
    // Check if assistant is asking a question
    if (msg.role === 'assistant') {
      const lowerContent = content.toLowerCase()
      
      // Detect question type
      if ((lowerContent.includes('what problem') || lowerContent.includes('what are you') || lowerContent.includes('**what**')) && !result.what) {
        lastQuestion = 'what'
      } else if ((lowerContent.includes('who is affected') || lowerContent.includes('who are') || lowerContent.includes('**who**')) && !result.who) {
        lastQuestion = 'who'
      } else if ((lowerContent.includes('why does this matter') || lowerContent.includes('why is') || lowerContent.includes('**why**')) && !result.why) {
        lastQuestion = 'why'
      } else if ((lowerContent.includes('what does success look like') || lowerContent.includes('success') || lowerContent.includes('**success**')) && !result.success) {
        lastQuestion = 'success'
      }
      
      // Also look for structured format in assistant responses (summaries)
      const whatPattern = /(?:what|problem)[:\-]\s*(.+?)(?:\n|who|why|success|$)/i
      const whatMatch = content.match(whatPattern)
      if (whatMatch && !result.what && whatMatch[1] && whatMatch[1].trim().length > 3) {
        result.what = whatMatch[1].trim()
      }
      
      const whoPattern = /(?:who|affected)[:\-]\s*(.+?)(?:\n|why|success|what|$)/i
      const whoMatch = content.match(whoPattern)
      if (whoMatch && !result.who && whoMatch[1] && whoMatch[1].trim().length > 3) {
        result.who = whoMatch[1].trim()
      }
      
      const whyPattern = /(?:why|matters?)[:\-]\s*(.+?)(?:\n|success|what|who|$)/i
      const whyMatch = content.match(whyPattern)
      if (whyMatch && !result.why && whyMatch[1] && whyMatch[1].trim().length > 3) {
        result.why = whyMatch[1].trim()
      }
      
      const successPattern = /(?:success|looks? like)[:\-]\s*(.+?)(?:\n|what|who|why|$)/i
      const successMatch = content.match(successPattern)
      if (successMatch && !result.success && successMatch[1] && successMatch[1].trim().length > 3) {
        result.success = successMatch[1].trim()
      }
    }
    
    // Check if user is answering a question
    if (msg.role === 'user' && lastQuestion) {
      const answer = content.trim()
      // Only capture if it's a substantial answer (not just "yes", "ok", etc.)
      if (answer.length > 5 && !answer.match(/^(yes|no|ok|okay|sure|yep|nope)$/i)) {
        if (lastQuestion === 'what' && !result.what) {
          result.what = answer
        } else if (lastQuestion === 'who' && !result.who) {
          result.who = answer
        } else if (lastQuestion === 'why' && !result.why) {
          result.why = answer
        } else if (lastQuestion === 'success' && !result.success) {
          result.success = answer
        }
        lastQuestion = null // Reset after capturing
      }
    }
    
    // Also look for explicit "what:", "who:", etc. patterns in user messages
    if (msg.role === 'user') {
      const whatMatch = msg.content.match(/(?:what|what problem)[:\-]\s*(.+?)(?:\n|$)/i)
      if (whatMatch && !result.what && whatMatch[1] && whatMatch[1].trim().length > 3) {
        result.what = whatMatch[1].trim()
      }
      
      const whoMatch = msg.content.match(/(?:who|who is affected)[:\-]\s*(.+?)(?:\n|$)/i)
      if (whoMatch && !result.who && whoMatch[1] && whoMatch[1].trim().length > 3) {
        result.who = whoMatch[1].trim()
      }
      
      const whyMatch = msg.content.match(/(?:why|why does this matter)[:\-]\s*(.+?)(?:\n|$)/i)
      if (whyMatch && !result.why && whyMatch[1] && whyMatch[1].trim().length > 3) {
        result.why = whyMatch[1].trim()
      }
      
      const successMatch = msg.content.match(/(?:success|what does success look like)[:\-]\s*(.+?)(?:\n|$)/i)
      if (successMatch && !result.success && successMatch[1] && successMatch[1].trim().length > 3) {
        result.success = successMatch[1].trim()
      }
    }
  }
  
  return result
}

/**
 * Extract Risks and Assumptions from conversation
 */
export function extractRisksAndAssumptions(messages: NormalizedMessage[]): DiscoverySpecV1['risksAndAssumptions'] {
  const items: DiscoverySpecV1['risksAndAssumptions'] = []
  const seen = new Set<string>()
  
  for (const msg of messages) {
    const content = msg.content
    
    // Look for bullet points or numbered lists
    const bulletPattern = /[•\-\*]\s*(?:\[?(?:RISK|ASSUMPTION|risk|assumption)\]?\s*)?(.+?)(?:\n|$)/gi
    let match
    while ((match = bulletPattern.exec(content)) !== null) {
      const text = match[1].trim()
      if (!text || text.length < 5) continue
      
      // Determine type
      const lowerText = text.toLowerCase()
      const isRisk = lowerText.includes('risk') || content.toLowerCase().includes('risk')
      const isAssumption = lowerText.includes('assumption') || content.toLowerCase().includes('assumption')
      
      // Extract impact if present
      let impact: "high" | "medium" | "low" | undefined
      if (lowerText.includes('high impact') || lowerText.includes('impact: high')) {
        impact = 'high'
      } else if (lowerText.includes('medium impact') || lowerText.includes('impact: medium')) {
        impact = 'medium'
      } else if (lowerText.includes('low impact') || lowerText.includes('impact: low')) {
        impact = 'low'
      }
      
      // Clean description
      let description = text
        .replace(/\[?(?:RISK|ASSUMPTION|risk|assumption)\]?/gi, '')
        .replace(/impact:\s*(?:high|medium|low)/gi, '')
        .trim()
      
      if (description.length < 3) continue
      
      // Create unique ID
      const id = `${isRisk ? 'risk' : 'assumption'}-${items.length + 1}`
      const key = `${isRisk ? 'risk' : 'assumption'}-${description.substring(0, 50).toLowerCase()}`
      
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          id,
          type: isRisk ? 'risk' : (isAssumption ? 'assumption' : 'risk'), // Default to risk
          description,
          ...(impact && { impact })
        })
      }
    }
    
    // Also look for numbered lists
    const numberedPattern = /\d+[\.\)]\s*(?:\[?(?:RISK|ASSUMPTION|risk|assumption)\]?\s*)?(.+?)(?:\n|$)/gi
    while ((match = numberedPattern.exec(content)) !== null) {
      const text = match[1].trim()
      if (!text || text.length < 5) continue
      
      const lowerText = text.toLowerCase()
      const isRisk = lowerText.includes('risk')
      const isAssumption = lowerText.includes('assumption')
      
      let description = text
        .replace(/\[?(?:RISK|ASSUMPTION|risk|assumption)\]?/gi, '')
        .trim()
      
      if (description.length < 3) continue
      
      const id = `${isRisk ? 'risk' : 'assumption'}-${items.length + 1}`
      const key = `${isRisk ? 'risk' : 'assumption'}-${description.substring(0, 50).toLowerCase()}`
      
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          id,
          type: isRisk ? 'risk' : (isAssumption ? 'assumption' : 'risk'),
          description
        })
      }
    }
  }
  
  // Limit to 12 items
  return items.slice(0, 12)
}

/**
 * Extract Hypotheses and Experiments from conversation
 */
export function extractHypotheses(messages: NormalizedMessage[]): DiscoverySpecV1['hypothesesAndExperiments'] {
  const items: DiscoverySpecV1['hypothesesAndExperiments'] = []
  const seen = new Set<string>()
  
  for (const msg of messages) {
    const content = msg.content
    
    // Look for "Hypothesis:" patterns
    const hypothesisPattern = /(?:hypothesis|hypothesis:)[:\-]?\s*(.+?)(?:\n|experiment|$)/gi
    let match
    while ((match = hypothesisPattern.exec(content)) !== null) {
      const hypothesis = match[1].trim()
      if (!hypothesis || hypothesis.length < 5) continue
      
      // Look for experiment in same message
      const experimentMatch = content.match(/(?:experiment|experiment:)[:\-]?\s*(.+?)(?:\n|hypothesis|$)/i)
      const experiment = experimentMatch ? experimentMatch[1].trim() : undefined
      
      const key = hypothesis.substring(0, 50).toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          id: `hyp-${items.length + 1}`,
          hypothesis,
          ...(experiment && { experiment })
        })
      }
    }
    
    // Also look for bullet points with hypothesis
    const bulletPattern = /[•\-\*]\s*(?:hypothesis:?\s*)?(.+?)(?:\n|$)/gi
    while ((match = bulletPattern.exec(content)) !== null) {
      const text = match[1].trim()
      if (!text || text.length < 5) continue
      
      // Check if it looks like a hypothesis
      const lowerText = text.toLowerCase()
      if (lowerText.includes('hypothesis') || lowerText.includes('if') || lowerText.includes('we believe')) {
        const key = text.substring(0, 50).toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          items.push({
            id: `hyp-${items.length + 1}`,
            hypothesis: text
          })
        }
      }
    }
  }
  
  // Limit to 12 items
  return items.slice(0, 12)
}

/**
 * Extract Decision Log from conversation
 */
export function extractDecisionLog(messages: NormalizedMessage[]): DiscoverySpecV1['decisionLog'] {
  const items: DiscoverySpecV1['decisionLog'] = []
  
  for (const msg of messages) {
    const content = msg.content
    
    // Look for decision patterns
    const decisionPattern = /(?:decision|decided)[:\-]?\s*(.+?)(?:\n|rationale|context|$)/gi
    let match
    while ((match = decisionPattern.exec(content)) !== null) {
      const decision = match[1].trim()
      if (!decision || decision.length < 5) continue
      
      // Look for rationale
      const rationaleMatch = content.match(/(?:rationale|reason)[:\-]?\s*(.+?)(?:\n|context|$)/i)
      const rationale = rationaleMatch ? rationaleMatch[1].trim() : undefined
      
      // Look for context
      const contextMatch = content.match(/(?:context)[:\-]?\s*(.+?)(?:\n|rationale|$)/i)
      const context = contextMatch ? contextMatch[1].trim() : undefined
      
      items.push({
        timestamp: new Date().toISOString(),
        decision,
        ...(rationale && { rationale }),
        ...(context && { context })
      })
    }
  }
  
  // Limit to 20 items
  return items.slice(0, 20)
}

/**
 * Extract Async Tasks from conversation
 */
export function extractAsyncTasks(messages: NormalizedMessage[]): DiscoverySpecV1['asyncTasks'] {
  const items: DiscoverySpecV1['asyncTasks'] = []
  const seen = new Set<string>()
  
  const roleMap: Record<string, 'Design' | 'Product' | 'Dev' | 'Research' | 'Analytics' | 'Other'> = {
    'design': 'Design',
    'product': 'Product',
    'dev': 'Dev',
    'development': 'Dev',
    'research': 'Research',
    'analytics': 'Analytics'
  }
  
  for (const msg of messages) {
    const content = msg.content
    
    // Look for task patterns
    const taskPattern = /(?:task|todo|action)[:\-]?\s*(.+?)(?:\n|owner|due|$)/gi
    let match
    while ((match = taskPattern.exec(content)) !== null) {
      const taskText = match[1].trim()
      if (!taskText || taskText.length < 5) continue
      
      // Extract owner role
      let ownerRole: 'Design' | 'Product' | 'Dev' | 'Research' | 'Analytics' | 'Other' = 'Other'
      const lowerText = taskText.toLowerCase()
      for (const [key, role] of Object.entries(roleMap)) {
        if (lowerText.includes(key)) {
          ownerRole = role
          break
        }
      }
      
      // Extract due time if present
      const dueMatch = content.match(/(?:due|deadline)[:\-]?\s*(\d+)\s*(?:hours?|hrs?|h)/i)
      const dueInHours = dueMatch ? parseInt(dueMatch[1], 10) : undefined
      
      const key = taskText.substring(0, 50).toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          ownerRole,
          task: taskText,
          ...(dueInHours && { dueInHours })
        })
      }
    }
  }
  
  // Limit to 6 items
  return items.slice(0, 6)
}

/**
 * Calculate document status based on extracted data
 */
export function calculateDocumentStatus(extracted: ExtractedDiscoveryData): DocumentStatus {
  const hasProblemFrame = 
    extracted.problemFrame?.what &&
    extracted.problemFrame?.who &&
    extracted.problemFrame?.why &&
    extracted.problemFrame?.success
  
  const hasRisks = extracted.risksAndAssumptions && extracted.risksAndAssumptions.length > 0
  const hasHypotheses = extracted.hypothesesAndExperiments && extracted.hypothesesAndExperiments.length > 0
  
  return (hasProblemFrame && hasRisks && hasHypotheses) ? 'COMPLETED' : 'IN_PROGRESS'
}

/**
 * Extract all discovery data from conversation
 */
export function extractDiscoveryData(messages: NormalizedMessage[]): ExtractedDiscoveryData {
  const problemFrame = extractProblemFrame(messages)
  return {
    ...(Object.keys(problemFrame).length > 0 && { problemFrame }),
    risksAndAssumptions: extractRisksAndAssumptions(messages),
    hypothesesAndExperiments: extractHypotheses(messages),
    decisionLog: extractDecisionLog(messages),
    asyncTasks: extractAsyncTasks(messages)
  }
}
