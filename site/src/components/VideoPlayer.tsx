import { useState, useRef } from 'react'
import { Play, VideoOff } from 'lucide-react'
import styles from './VideoPlayer.module.css'

type Props = { src: string; poster?: string; title: string }

export function VideoPlayer({ src, poster, title }: Props) {
  const [playing, setPlaying] = useState(false)
  const [errored, setErrored] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)

  function handlePlay() {
    setPlaying(true)
    ref.current?.play()
  }

  if (errored) {
    return (
      <div className={styles.placeholder} aria-label={`Video unavailable: ${title}`}>
        <VideoOff size={28} style={{ opacity: 0.4 }} />
        <span className={styles.placeholderText}>Video coming soon</span>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <video
        ref={ref}
        className={styles.video}
        src={src}
        poster={poster}
        controls={playing}
        aria-label={title}
        onError={() => setErrored(true)}
      />
      {!playing && (
        <button className={styles.playBtn} onClick={handlePlay} aria-label={`Play ${title}`}>
          <Play size={28} style={{ opacity: 0.9 }} />
        </button>
      )}
    </div>
  )
}
