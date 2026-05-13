'use client'

import { useEffect, useRef } from 'react'

interface VideoBackgroundProps {
  src: string
  overlayOpacity?: number
}

export function VideoBackground({ src, overlayOpacity = 0.5 }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {
      // Autoplay pode falhar em alguns browsers — o atributo autoPlay no <video> cuida do fallback
    })
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          objectFit: 'cover',
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
        }}
      />
    </div>
  )
}
