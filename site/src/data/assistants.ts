import { MessageSquare, Leaf, Eye, Monitor, BarChart2 } from 'lucide-react'
import type { Assistant } from './types'

export const ASSISTANTS: Assistant[] = [
  {
    id: 'general',
    name: 'General',
    tagline: "Ask me anything about your design. I'll help you explain, improve, and document your work.",
    accent: '#4a90e2',
    icon: MessageSquare,
    status: 'live',
    video: 'general.mp4',
    howToUse: [
      { number: 1, title: 'Open the plugin in Figma', description: 'Launch the Design AI Toolkit from the Figma plugin menu.' },
      { number: 2, title: 'Select General', description: 'Choose General from the assistant selector at the top of the plugin.' },
      { number: 3, title: 'Ask your question or describe your work', description: 'Type a design question, ask for feedback on a selected element, or request help with copy.' },
      { number: 4, title: 'Apply the response', description: 'Copy text, use the suggestions in Figma, or continue the conversation to refine.' },
    ],
    quickActions: ['Explain this design', 'Design suggestions', 'Run Smart Detector'],
    resources: [
      { title: 'Prompt Writing Guide', description: 'How to write effective prompts for consistent output.', tag: 'Doc', href: '#' },
      { title: 'Smart Detector Guide', description: 'What the Smart Detector scans and how to read its output.', tag: 'Guide', href: '#' },
      { title: 'Example Conversations', description: 'Real examples of productive General assistant sessions.', tag: 'Examples', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Product Design', isLead: true, avatarInitials: 'TL' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'MB' },
      ],
      openSlots: [{ role: 'Content Strategist', description: 'Prompt design and output quality review', applyHref: '#' }],
    },
  },
  {
    id: 'evergreens',
    name: 'Evergreens',
    tagline: 'Select a Figma frame to generate a structured content inventory of all text elements.',
    accent: '#007a39',
    icon: Leaf,
    status: 'live',
    video: 'evergreens.mp4',
    howToUse: [
      { number: 1, title: 'Select a container in Figma', description: 'Click on a frame, section, or component that contains the text content you want to document.' },
      { number: 2, title: 'Open the plugin and select Evergreens', description: 'Launch the Design AI Toolkit and choose the Evergreens assistant.' },
      { number: 3, title: 'Run GENERATE TABLE', description: 'Click the "GENERATE TABLE" quick action. The assistant scans all text layers and outputs a structured content table.' },
      { number: 4, title: 'Review the content inventory', description: 'The table shows each element with its type, content, variants/states, and notes. Use Copy Table to export it.' },
      { number: 5, title: 'Add more frames with ADD', description: 'Select additional containers and click "ADD" to append their content rows to the existing table.' },
    ],
    quickActions: ['GENERATE TABLE', 'ADD', 'Copy Table', 'View Table'],
    resources: [
      { title: 'Content Inventory Format', description: 'The structured output format: element, type, content, variants/states, notes.', tag: 'Doc', href: '#' },
      { title: 'Evergreens Update Process', description: 'Who can update the knowledge base and the review/approval flow.', tag: 'Guide', href: '#' },
      { title: 'Ignore Rules Reference', description: 'How to configure which Figma elements are excluded from scans.', tag: 'Doc', href: '#' },
    ],
    bestPractices: [
      { title: 'Select the right container', description: 'Select the highest-level container that contains the content you need. PAGE and DOCUMENT nodes are skipped automatically.' },
      { title: 'Hidden layers are excluded', description: 'The scanner skips hidden layers by default. Make visible all content you want captured before running the scan.' },
      { title: 'Use ADD for multi-frame inventories', description: 'Run GENERATE TABLE on the first frame, then use ADD to append subsequent frames without losing prior rows.' },
      { title: 'Document variants and states', description: 'For interactive elements, describe hover, disabled, and error states in the Notes column so nothing is missed at handoff.' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Content Design', isLead: true, avatarInitials: 'BG' },
        { name: 'FPO Member', role: 'Product Manager', isLead: false, avatarInitials: 'TM' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'SR' },
      ],
      openSlots: [{ role: 'Content Strategist', description: 'Content modeling, taxonomy review, stakeholder alignment', applyHref: '#' }],
    },
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    tagline: 'Select any element and get an instant WCAG compliance review with specific, actionable findings.',
    accent: '#e07b00',
    icon: Eye,
    status: 'live',
    video: 'accessibility.mp4',
    howToUse: [
      { number: 1, title: 'Select a frame or component in Figma', description: 'Click on the element you want to review. The assistant uses a screenshot of your selection for the analysis.' },
      { number: 2, title: 'Open the plugin and select Accessibility', description: 'Launch the Design AI Toolkit and choose the Accessibility assistant.' },
      { number: 3, title: 'Run "Check accessibility"', description: 'Click the quick action. The assistant reviews your selection for color contrast, text sizing, interactive elements, and WCAG compliance.' },
      { number: 4, title: 'Review findings and act', description: 'Read the findings. Each issue includes the criterion, severity, and a remediation suggestion you can act on directly.' },
    ],
    quickActions: ['Check accessibility', 'WCAG compliance'],
    resources: [
      { title: 'WCAG 2.2 AA Criteria Reference', description: 'The full set of criteria the assistant checks against.', tag: 'Doc', href: '#' },
      { title: 'Audit Sheet Template', description: 'Spreadsheet for tracking findings across multiple screens.', tag: 'Template', href: '#' },
      { title: 'Remediation Patterns', description: 'Common fixes for the most frequently flagged accessibility issues.', tag: 'Guide', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Accessibility', isLead: true, avatarInitials: 'AL' },
        { name: 'FPO Member', role: 'Product Design', isLead: false, avatarInitials: 'PS' },
      ],
      openSlots: [
        { role: 'Engineering', description: 'ARIA implementation review and automated testing integration', applyHref: '#' },
        { role: 'Product', description: 'Stakeholder requirements and compliance tracking', applyHref: '#' },
      ],
    },
  },
  {
    id: 'design-workshop',
    name: 'Design Workshop',
    tagline: 'Describe the screens you need and the assistant generates them directly on your Figma canvas.',
    accent: '#7c3aed',
    icon: Monitor,
    status: 'live',
    video: 'design-workshop.mp4',
    howToUse: [
      { number: 1, title: 'Open the plugin and select Design Workshop', description: 'Launch the Design AI Toolkit and choose the Design Workshop assistant.' },
      { number: 2, title: 'Describe the screens you want', description: 'Type a description of the screens you need: what they are for, what content they should show, and any styling guidance.' },
      { number: 3, title: 'Run "Demo: Generate Screens"', description: 'Click the quick action. The assistant creates 1–5 Figma screens on your canvas based on your description.' },
      { number: 4, title: 'Review and refine', description: 'Inspect the generated frames. Continue the conversation to adjust layout, content, or styling as needed.' },
    ],
    quickActions: ['Demo: Generate Screens', 'Run Demo', 'Demo: Dashboard'],
    resources: [
      { title: 'Screen Generation Guide', description: 'How to write effective screen descriptions for best results.', tag: 'Guide', href: '#' },
      { title: 'Jazz Design System Reference', description: 'The design system the generator uses for hi-fidelity output.', tag: 'Doc', href: '#' },
      { title: 'Demo Presets', description: 'Pre-built demo configurations for common screen types.', tag: 'Template', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Product Design', isLead: true, avatarInitials: 'MK' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'JP' },
      ],
      openSlots: [
        { role: 'UX Design', description: 'Screen template design and generation quality review', applyHref: '#' },
        { role: 'Product', description: 'Use case definition and demo preset maintenance', applyHref: '#' },
      ],
    },
  },
  {
    id: 'analytics-tagging',
    name: 'Analytics Tagging',
    tagline: 'Scan annotated Figma frames for ScreenID and ActionID tags and export a clean analytics table.',
    accent: '#008282',
    icon: BarChart2,
    status: 'live',
    video: 'analytics-tagging.mp4',
    howToUse: [
      { number: 1, title: 'Annotate your screens with ScreenID', description: 'Each frame you want to tag must have a ScreenID annotation placed in Figma before scanning.' },
      { number: 2, title: 'Select annotated frames', description: 'Select one or more frames that have ScreenID annotations. Multi-select is supported.' },
      { number: 3, title: 'Run "Get Analytics Tags"', description: 'Click the quick action. The assistant scans the selected frames for ScreenID and ActionID annotations and builds the table.' },
      { number: 4, title: 'Copy the table', description: 'Use "Copy Table" to export the results. Paste directly into your analytics tracking doc or Jira ticket.' },
    ],
    quickActions: ['Get Analytics Tags', 'Append Selection', 'Copy Table'],
    resources: [
      { title: 'Analytics Taxonomy Spec', description: 'Complete tagging vocabulary, naming conventions, and field definitions.', tag: 'Doc', href: '#' },
      { title: 'ScreenID Annotation Guide', description: 'How to place ScreenID annotations correctly in Figma.', tag: 'Guide', href: '#' },
      { title: 'ActionID Annotation Guide', description: 'How to annotate interactive elements with ActionID for scan detection.', tag: 'Guide', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Analytics', isLead: true, avatarInitials: 'AL' },
        { name: 'FPO Member', role: 'Product Design', isLead: false, avatarInitials: 'FP' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'MK' },
      ],
      openSlots: [],
    },
  },
]

export function getAssistant(id: string): Assistant | undefined {
  return ASSISTANTS.find(a => a.id === id)
}

export const LIVE_ASSISTANTS = ASSISTANTS.filter(a => a.status === 'live')
