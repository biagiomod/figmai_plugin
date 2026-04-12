import { useParams, Navigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { VideoPlayer } from '../components/VideoPlayer'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { StrikeTeamProfile } from '../components/StrikeTeamProfile'
import { getAssistant } from '../data/assistants'
import styles from './AssistantPage.module.css'

export function AssistantPage() {
  const { slug } = useParams<{ slug: string }>()
  const assistant = getAssistant(slug ?? '')

  if (!assistant) return <Navigate to="/" replace />

  const { name, tagline, accent, icon: Icon, video, howToUse, quickActions, resources, bestPractices, strikeTeam } = assistant

  return (
    <div className={styles.page} style={{ '--ac-color': accent } as React.CSSProperties}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}><span className={styles.eyebrowBorder} />{name}</div>
        <h1 className={styles.headline}>{name}</h1>
        <p className={styles.tagline}>{tagline}</p>
        <div className={styles.heroCtas}>
          <a href="#" className={styles.btnPrimary}><Icon size={13} style={{ opacity: 0.7 }} /> Open in Figma</a>
          <a href="#feedback" className={styles.btnGhost}>Submit Feedback</a>
        </div>
      </section>

      {/* Video */}
      <section className={styles.section}>
        <VideoPlayer src={`/videos/${video}`} title={`${name} assistant walkthrough`} />
      </section>

      {/* How to Use */}
      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>How to Use</div>
        <h2 className={styles.sectionTitle}>Get started in four steps</h2>
        <div className={styles.stepsGrid}>
          {howToUse.map(step => (
            <div key={step.number} className={styles.stepCard}>
              <span className={styles.stepNum}>{step.number}</span>
              <div>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDesc}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.chips}>
          {quickActions.map(q => (
            <span key={q} className={styles.chip}>{q}</span>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>Resources</div>
        <h2 className={styles.sectionTitle}>Helpful links</h2>
        <div className={styles.resourcesGrid}>
          {resources.map(r => (
            <a key={r.title} href={r.href} target="_blank" rel="noopener noreferrer" className={styles.resourceCard}>
              <span className={styles.resourceTag} style={{ color: accent, background: `${accent}18` }}>{r.tag}</span>
              <div className={styles.resourceTitle}>{r.title}</div>
              <div className={styles.resourceDesc}>{r.description}</div>
            </a>
          ))}
        </div>
      </section>

      {/* Best Practices — Evergreens only */}
      {bestPractices && (
        <section className={styles.section}>
          <div className={styles.sectionEyebrow}>Best Practices</div>
          <h2 className={styles.sectionTitle}>Tips for great results</h2>
          <div className={styles.bpGrid}>
            {bestPractices.map(bp => (
              <div key={bp.title} className={styles.bpCard}>
                <div className={styles.bpTitle}>{bp.title}</div>
                <div className={styles.bpDesc}>{bp.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strike Team */}
      <StrikeTeamProfile teamName={name} strikeTeam={strikeTeam} />

      {/* Feedback */}
      <section id="feedback" className={styles.section}>
        <div className={styles.sectionEyebrow}>Feedback</div>
        <h2 className={styles.sectionTitle}>Get in touch</h2>
        <FeedbackPanel bugHref="#" changeHref="#" />
      </section>

      <Footer />
    </div>
  )
}
