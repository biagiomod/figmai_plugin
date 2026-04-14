import { Zap, Target, Lightbulb } from 'lucide-react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { AssistantCard } from '../components/AssistantCard'
import { StrikeTeamSection } from '../components/StrikeTeamSection'
import { VideoPlayer } from '../components/VideoPlayer'
import { LIVE_ASSISTANTS } from '../data/assistants'
import styles from './Home.module.css'
import type { LucideIcon } from 'lucide-react'

const PHILOSOPHY: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Zap,       title: 'Speed without shortcuts', body: 'AI-assisted design compresses research, documentation, and ideation cycles, so your team can move faster without cutting corners.' },
  { icon: Target,    title: 'Consistency at scale',    body: 'From Evergreens to accessibility, every assistant is wired to your design system, standards, and taxonomy by default.' },
  { icon: Lightbulb, title: 'Confident decisions',     body: 'Better context, faster synthesis, and real-time guidance means your team ships with more confidence and less second-guessing.' },
]

export function Home() {
  return (
    <div className={styles.page}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroEyebrow}>Design AI Toolkit</div>
        <h1 className={styles.heroHeadline}>
          Design moves fast.<br />
          <span className={styles.heroAccent}>Your tools should too.</span>
        </h1>
        <p className={styles.heroSub}>Five AI assistants built for designers, wired to your system, your standards, and your workflow.</p>
        <div className={styles.heroCtas}>
          <a href="#assistants" className={styles.btnPrimary}>Explore Assistants</a>
          <a href="/roadmap" className={styles.btnGhost}>View Roadmap</a>
        </div>
      </section>

      {/* Overview video */}
      <section className={styles.videoSection}>
        <VideoPlayer
          src="/videos/overview.mp4"
          poster="/videos/overview-poster.jpg"
          title="Design AI Toolkit overview"
        />
      </section>

      {/* Philosophy */}
      <section className={styles.philosophy}>
        {PHILOSOPHY.map(p => (
          <div key={p.title} className={styles.philCard}>
            <div className={styles.philIcon}><p.icon size={18} color="#fff" /></div>
            <h3 className={styles.philTitle}>{p.title}</h3>
            <p className={styles.philBody}>{p.body}</p>
          </div>
        ))}
      </section>

      {/* Assistants grid */}
      <section id="assistants" className={styles.assistants}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Assistants</div>
          <h2 className={styles.sectionTitle}>Five tools. One toolkit.</h2>
        </div>
        <div className={styles.grid}>
          {LIVE_ASSISTANTS.map(a => <AssistantCard key={a.id} assistant={a} />)}
        </div>
      </section>

      {/* Strike Teams */}
      <StrikeTeamSection />

      <Footer />
    </div>
  )
}
