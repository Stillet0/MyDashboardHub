import type { NavBadge } from '../lib/useNavBadges'

/** Petite pastille façon notification, posée sur un bouton de menu (parent en `relative`). */
export default function NavBadgeDot({ badge }: { badge: NavBadge | undefined }) {
  if (!badge || badge.count === 0) return null
  return (
    <span
      className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#1a1408]"
      style={{ background: badge.overdue ? 'var(--red)' : 'var(--gold)' }}
    >
      {badge.count > 99 ? '99+' : badge.count}
    </span>
  )
}
