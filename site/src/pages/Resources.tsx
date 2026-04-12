import { Play, PenTool, Hash, GitBranch, Code2 } from 'lucide-react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { ResourceCard } from '../components/ResourceCard'
import { RESOURCES_SECTIONS } from '../data/resources'
import { LIVE_ASSISTANTS } from '../data/assistants'
import styles from './Resources.module.css'

export function Resources() {
  return (
    <div className={styles.page}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Resources</div>
        <h1 className={styles.headline}>Guides, templates,<br />and tools to get you going.</h1>
        <p className={styles.sub}>Everything you need to use the Design AI Toolkit effectively: documentation, how-to videos, Figma templates, and links to the team.</p>
      </section>

      <div className={styles.body}>
        {/* Start Here */}
        <div className={styles.featured}>
          <div className={styles.featuredIcon}><Play size={20} style={{ opacity: 0.7 }} /></div>
          <div className={styles.featuredText}>
            <div className={styles.featuredLabel}>Start here</div>
            <div className={styles.featuredTitle}>Design AI Toolkit — Intro Video</div>
            <div className={styles.featuredDesc}>5-minute walkthrough of all five assistants, how they connect, and when to use each one.</div>
          </div>
          <a href="#" className={styles.featuredCta}><Play size={12} /> Watch now</a>
        </div>

        {/* Getting Started */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Getting Started</div>
          <div className={styles.grid3}>
            {RESOURCES_SECTIONS.find(s => s.id === 'getting-started')?.items.map(item => (
              <ResourceCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        {/* Video Library */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Video Library</div>
          <div className={styles.grid3}>
            {LIVE_ASSISTANTS.map(a => (
              <ResourceCard key={a.id} item={{
                title: `${a.name} Assistant Walkthrough`,
                description: a.tagline,
                tag: 'Video',
                tagColor: a.accent,
                source: '4 min',
                href: '#',
              }} />
            ))}
          </div>
        </div>

        {/* Templates + Tools */}
        <div className={styles.twoCol}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Templates</div>
            <div className={styles.listCard}>
              {RESOURCES_SECTIONS.find(s => s.id === 'templates')?.items.map(item => (
                <a key={item.title} href={item.href} className={styles.listItem}>
                  <span className={styles.listIcon}><PenTool size={13} /></span>
                  <div>
                    <div className={styles.listTitle}>{item.title}</div>
                    <div className={styles.listDesc}>{item.description}</div>
                  </div>
                  <span className={styles.listTag} style={{ color: item.tagColor, background: `${item.tagColor}18` }}>{item.tag}</span>
                </a>
              ))}
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Tools &amp; Links</div>
            <div className={styles.listCard}>
              {RESOURCES_SECTIONS.find(s => s.id === 'tools')?.items.map(item => (
                <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className={styles.listItem}>
                  <span className={styles.listIcon}>{item.title.includes('Plugin') ? <PenTool size={13} /> : item.title.includes('Slack') ? <Hash size={13} /> : item.title.includes('Jira') ? <GitBranch size={13} /> : <Code2 size={13} />}</span>
                  <div>
                    <div className={styles.listTitle}>{item.title}</div>
                    <div className={styles.listDesc}>{item.description}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Documentation</div>
          <div className={styles.grid3}>
            {RESOURCES_SECTIONS.find(s => s.id === 'documentation')?.items.map(item => (
              <ResourceCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        {/* Contact bar */}
        <div className={styles.contactBar}>
          <div>
            <div className={styles.contactTitle}>Missing something?</div>
            <div className={styles.contactSub}>Request a guide, report a broken link, or suggest a resource to add.</div>
          </div>
          <div className={styles.contactActions}>
            <a href="#" className={styles.contactBtn}>+ Request a resource</a>
            <a href="#" className={styles.contactBtn}>↗ Report an issue</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
