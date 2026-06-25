// Maps stored color names to Tailwind class strings.
// Returns safe static classes (no dynamic class construction).

type ColorClasses = {
  bg: string
  bgSoft: string
  text: string
  border: string
  ring: string
  gradient: string
  dot: string
}

const COLORS: Record<string, ColorClasses> = {
  emerald: {
    bg: 'bg-emerald-500',
    bgSoft: 'bg-emerald-100 dark:bg-emerald-950/50',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500',
    gradient: 'from-emerald-500 to-teal-600',
    dot: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-100 dark:bg-amber-950/50',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
    gradient: 'from-amber-500 to-orange-600',
    dot: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-500',
    bgSoft: 'bg-rose-100 dark:bg-rose-950/50',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500',
    ring: 'ring-rose-500',
    gradient: 'from-rose-500 to-pink-600',
    dot: 'bg-rose-500',
  },
  sky: {
    bg: 'bg-sky-500',
    bgSoft: 'bg-sky-100 dark:bg-sky-950/50',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500',
    ring: 'ring-sky-500',
    gradient: 'from-sky-500 to-cyan-600',
    dot: 'bg-sky-500',
  },
  violet: {
    bg: 'bg-violet-500',
    bgSoft: 'bg-violet-100 dark:bg-violet-950/50',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500',
    ring: 'ring-violet-500',
    gradient: 'from-violet-500 to-purple-600',
    dot: 'bg-violet-500',
  },
  orange: {
    bg: 'bg-orange-500',
    bgSoft: 'bg-orange-100 dark:bg-orange-950/50',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500',
    ring: 'ring-orange-500',
    gradient: 'from-orange-500 to-red-600',
    dot: 'bg-orange-500',
  },
}

export function getColor(color: string): ColorClasses {
  return COLORS[color] || COLORS.emerald
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
