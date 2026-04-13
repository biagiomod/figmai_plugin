import { useState, useRef } from 'react'
import { Play, X, VideoOff } from 'lucide-react'
import styles from './VideoPlayer.module.css'

type Props = {
  src: string
  poster?: string
  title: string
}

export function VideoPlayer({ src, poster, title }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [errored, setErrored] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)

  function handleExpand() {
    setExpanded(true)
    setTimeout(() => ref.current?.play(), 50)
  }

  function handleCollapse() {
    setExpanded(false)
    if (ref.current) {
      ref.current.pause()
      ref.current.currentTime = 0
    }
  }

  if (errored) {
    return (
      <div className={styles.placeholder} aria-label={`Video unavailable: ${title}`}>
        <VideoOff size={28} style={{ opacity: 0.4 }} />
        <span className={styles.placeholderText}>Video coming soon</span>
      </div>
    )
  }

  if (expanded) {
    return (
      <div className={styles.expanded}>
        <video
          ref={ref}
          className={styles.video}
          src={src}
          poster={poster}
          controls
          aria-label={title}
          onError={() => setErrored(true)}
          onEnded={handleCollapse}
        />
        <button className={styles.closeBtn} onClick={handleCollapse} aria-label="Close video">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      className={styles.teaser}
      onClick={handleExpand}
      aria-label={`Play ${title}`}
      style={poster ? { backgroundImage: `url(${poster})` } : undefined}
    >
      <div className={styles.playOverlay}>
        <div className={styles.playBtn}>
          <Play size={22} fill="#fff" color="#fff" style={{ marginLeft: 3 }} />
        </div>
      </div>
    </button>
  )
}
