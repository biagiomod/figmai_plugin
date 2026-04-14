export type ResourceItem = {
  title: string
  description: string
  tag: string
  tagColor: string
  source: string
  href: string
  accentColor?: string
}

export type ResourceSection = {
  id: string
  title: string
  iconName: string
  color: string
  items: ResourceItem[]
}

export const RESOURCES_SECTIONS: ResourceSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    iconName: 'map',
    color: '#005fcc',
    items: [
      { title: 'Quick Start: Your First AI-Assisted Design', description: 'Step-by-step walkthrough from opening the plugin to your first generated component.', tag: 'Guide', tagColor: '#005fcc', source: 'Docs', href: '#' },
      { title: 'Installing and Configuring the Plugin', description: 'How to install the Figma plugin, connect your profile, and set your preferences.', tag: 'Video', tagColor: '#c0006a', source: '3 min', href: '#' },
      { title: 'Starter Figma File', description: 'Pre-wired Figma file with component slots, annotation layers, and tagging placeholders.', tag: 'Template', tagColor: '#007a39', source: 'Figma Community', href: '#' },
      { title: 'Choosing the Right Assistant', description: 'Decision guide: which assistant to use for research, documentation, accessibility, and tagging.', tag: 'Guide', tagColor: '#005fcc', source: 'Docs', href: '#' },
    ],
  },
  {
    id: 'templates',
    title: 'Templates',
    iconName: 'layout-template',
    color: '#007a39',
    items: [
      { title: 'Evergreens Content Model', description: 'Figma file for pattern authoring scaffold', tag: 'Figma', tagColor: '#007a39', source: 'Figma', href: '#' },
      { title: 'Accessibility Audit Sheet', description: 'Spreadsheet template for WCAG reviews', tag: 'Sheet', tagColor: '#007a39', source: 'Sheets', href: '#' },
      { title: 'Workshop Facilitation Deck', description: 'Slides for running an AI-assisted workshop', tag: 'Slides', tagColor: '#007a39', source: 'Slides', href: '#' },
      { title: 'Tagging Taxonomy Reference', description: 'Analytics taxonomy for Jira annotation', tag: 'Doc', tagColor: '#007a39', source: 'Doc', href: '#' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools & Links',
    iconName: 'wrench',
    color: '#9a5500',
    items: [
      { title: 'Figma Plugin: Install', description: 'Install Design AI Toolkit in Figma', tag: 'External', tagColor: '#9a5500', source: 'Figma', href: '#' },
      { title: '#design-ai-toolkit Slack', description: 'Questions, feedback, announcements', tag: 'External', tagColor: '#9a5500', source: 'Slack', href: '#' },
      { title: 'Jira Project Board', description: 'Track requests, bugs, and roadmap items', tag: 'External', tagColor: '#9a5500', source: 'Jira', href: '#' },
      { title: 'GitHub Repository', description: 'Source code and contributing guide', tag: 'External', tagColor: '#9a5500', source: 'GitHub', href: '#' },
    ],
  },
  {
    id: 'documentation',
    title: 'Documentation',
    iconName: 'file-text',
    color: '#5600cc',
    items: [
      { title: 'Data Handling and Privacy Policy', description: 'How prompts, outputs, and Figma data are handled, retained, and secured.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'AI Use Guidelines for Design', description: 'Approved use cases, review obligations, and quality standards for AI-generated outputs.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Evergreens Update Process', description: 'Who can update entries, review steps, and approval flow for new Evergreens.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Accessibility Standards Reference', description: 'WCAG 2.2 criteria mapped to our component library with remediation guidance.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Analytics Taxonomy Spec', description: 'Complete tagging vocabulary, naming conventions, and Jira field mappings.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Prompt Writing Best Practices', description: 'How to write effective prompts for each assistant to get consistent, high-quality output.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
    ],
  },
]
