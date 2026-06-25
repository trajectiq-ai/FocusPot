'use client'

import { motion } from 'framer-motion'

/**
 * A small SVG plant that grows out of a pot.
 * Used as the satisfying success animation when a focus session completes.
 */
export function PlantAnimation() {
  return (
    <motion.svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-label="Plant growing animation"
    >
      {/* Pot */}
      <motion.path
        d="M 42 92 L 47 122 L 93 122 L 98 92 Z"
        fill="oklch(0.62 0.16 38)"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ transformOrigin: '70px 122px' }}
      />
      <motion.ellipse
        cx="70"
        cy="92"
        rx="28"
        ry="5"
        fill="oklch(0.55 0.16 38)"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.2 }}
        style={{ transformOrigin: '70px 92px' }}
      />

      {/* Stem */}
      <motion.line
        x1="70"
        y1="92"
        x2="70"
        y2="50"
        stroke="oklch(0.5 0.14 155)"
        strokeWidth="3.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      />

      {/* Left leaf */}
      <motion.path
        d="M 70 70 Q 45 58 38 75 Q 50 80 70 75 Z"
        fill="oklch(0.6 0.16 155)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.5, ease: 'backOut' }}
        style={{ transformOrigin: '70px 70px' }}
      />

      {/* Right leaf */}
      <motion.path
        d="M 70 64 Q 95 52 102 69 Q 90 74 70 69 Z"
        fill="oklch(0.66 0.15 155)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.7, ease: 'backOut' }}
        style={{ transformOrigin: '70px 64px' }}
      />

      {/* Top sprout */}
      <motion.circle
        cx="70"
        cy="46"
        r="7"
        fill="oklch(0.72 0.16 155)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.95, ease: 'backOut' }}
        style={{ transformOrigin: '70px 46px' }}
      />

      {/* Sparkles */}
      {[
        { cx: 30, cy: 35, delay: 1.1 },
        { cx: 110, cy: 45, delay: 1.25 },
        { cx: 105, cy: 90, delay: 1.4 },
      ].map((s, i) => (
        <motion.circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r="2"
          fill="oklch(0.75 0.15 75)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, delay: s.delay, repeat: Infinity, repeatDelay: 1.2 }}
        />
      ))}
    </motion.svg>
  )
}
