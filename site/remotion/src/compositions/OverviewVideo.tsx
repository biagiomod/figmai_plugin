import { useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { BrandIntro } from './overview/BrandIntro'
import { PainPoints } from './overview/PainPoints'
import { AssistantShowcase } from './overview/AssistantShowcase'
import { Benefits } from './overview/Benefits'
import { CtaClose } from './overview/CtaClose'

// Load Inter at module level
const { fontFamily } = loadFont('normal')

/**
 * Landing page overview video — 40 seconds (1200 frames, 30fps), 1280×720.
 * Dark cinematic theme: contrasts with the light per-assistant videos.
 *
 * Act timing:
 *   0–120   Brand Intro   (4s)  — toolkit wordmark + 5 dots emerge from pink glow
 *   120–300 Pain Points   (6s)  — 3 designer headaches, 2s each
 *   300–900 Assistants    (20s) — all 5 assistants, 4s each, accent-color glow
 *   900–1080 Benefits     (6s)  — Speed / Accuracy / Consistency cards stagger in
 *   1080–1200 CTA Close   (4s)  — full brand lockup + "Open in Figma" pill
 */
export function OverviewVideo() {
  const frame = useCurrentFrame()

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0a',
        fontFamily,
      }}
    >
      {frame < 120 && <BrandIntro />}
      {frame >= 120 && frame < 300 && <PainPoints />}
      {frame >= 300 && frame < 900 && <AssistantShowcase />}
      {frame >= 900 && frame < 1080 && <Benefits />}
      {frame >= 1080 && <CtaClose />}
    </div>
  )
}
