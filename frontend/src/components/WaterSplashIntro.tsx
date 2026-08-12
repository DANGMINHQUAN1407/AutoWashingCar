import { useEffect, useRef, useState } from 'react'
import './WaterSplashIntro.css'

interface WaterSplashIntroProps {
  onCleanStart?: () => void
  isActive?: boolean
}

export default function WaterSplashIntro({ onCleanStart, isActive = true }: WaterSplashIntroProps) {
  const [videoEnded, setVideoEnded] = useState(!isActive)
  const videoRef = useRef<HTMLVideoElement>(null)

  const cleanedStarted = useRef(false)

  const handleEnded = () => {
    if (cleanedStarted.current) return
    cleanedStarted.current = true
    setVideoEnded(true)
    if (onCleanStart) {
      onCleanStart()
    }
  }

  const handleSkip = () => {
    if (!videoEnded) {
      handleEnded()
    }
  }

  // Fallback in case video fails to load or play
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!videoEnded) {
        handleEnded()
      }
    }, 9000) // Fallback timeout matching the max length
    return () => clearTimeout(timer)
  }, [videoEnded])

  // Class for the video container based on end state
  const containerClass = `video-intro-container ${videoEnded ? 'as-background' : 'as-overlay'} ${
    videoEnded && !isActive ? 'is-hidden' : ''
  }`

  return (
    <div className={containerClass} onClick={handleSkip}>
      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        className="intro-video-element"
        onEnded={handleEnded}
      />
      {/* Cinematic dark overlays that fade out at the end */}
      <div className={`cinematic-spotlight ${videoEnded ? 'fade-out' : ''}`} />
      <div className={`cinematic-vignette ${videoEnded ? 'fade-out' : ''}`} />

      {/* Skip Hint */}
      {!videoEnded && (
        <div className="skip-hint">
          <span>Click to skip</span>
          <span className="skip-arrow">→</span>
        </div>
      )}
    </div>
  )
}

