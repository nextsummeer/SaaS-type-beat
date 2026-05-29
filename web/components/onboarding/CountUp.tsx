'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  to: number
  duration?: number
  decimals?: number
  startDelay?: number
  className?: string
  style?: React.CSSProperties
}

export function CountUp({
  to,
  duration = 1600,
  decimals = 0,
  startDelay = 0,
  className,
  style,
}: Props) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let startTime = 0
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)
      if (!cancelled) {
        setValue(eased * to)
        if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      }
    }

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick)
    }, startDelay)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [to, duration, startDelay])

  const display =
    decimals === 0
      ? Math.round(value).toLocaleString('pt-BR')
      : value.toLocaleString('pt-BR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })

  return (
    <span aria-live="polite" className={className} style={style}>
      {display}
    </span>
  )
}
