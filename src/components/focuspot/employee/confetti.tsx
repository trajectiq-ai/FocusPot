'use client'

import { useEffect, useState } from 'react'

const CONFETTI_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#f97316', // orange
]

type Piece = {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  size: number
  rounded: boolean
}

/**
 * Lightweight confetti burst using the `.confetti-piece` CSS class defined in
 * globals.css. Render with a `key` based on the trigger so each `run=true`
 * cycle creates a fresh instance (avoids setState-in-effect lint warnings).
 */
export function Confetti({ run, duration = 5000 }: { run: boolean; duration?: number }) {
  // `hidden` flips to true (via setTimeout callback, not in effect body) once
  // the burst has played out.
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!run) return
    const t = setTimeout(() => setHidden(true), duration)
    return () => clearTimeout(t)
  }, [run, duration])

  if (!run || hidden) return null

  const pieces: Piece[] = Array.from({ length: 90 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 2.2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    rounded: Math.random() > 0.5,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.rounded ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

