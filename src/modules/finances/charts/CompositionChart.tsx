import type { Category, FinancesData, Snapshot } from '../../../lib/finances'
import { snapshotByCategory } from '../../../lib/finances'

export default function CompositionChart({
  data,
  snapshots,
}: {
  data: FinancesData
  snapshots: Snapshot[]
}) {
  const width = 800
  const height = 220
  const padding = 10
  const categories: Category[] = data.categories
  const n = snapshots.length

  const perMonth = snapshots.map((s) => snapshotByCategory(data, s))
  const totals = perMonth.map((byCat) => categories.reduce((sum, c) => sum + (byCat[c.name] || 0), 0))
  const max = Math.max(...totals, 1)

  function yFor(cumValue: number) {
    return height - padding - (cumValue / max) * (height - padding * 2)
  }
  function xFor(i: number) {
    return padding + (i / (n - 1 || 1)) * (width - padding * 2)
  }

  let cumulative = new Array(n).fill(0)
  const bands = categories.map((cat) => {
    const bottomCum = [...cumulative]
    const values = perMonth.map((byCat) => byCat[cat.name] || 0)
    cumulative = cumulative.map((c, i) => c + values[i])
    const topCum = [...cumulative]

    const topPoints = topCum.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' L')
    const bottomPoints = bottomCum
      .map((v, i) => `${xFor(i)},${yFor(v)}`)
      .reverse()
      .join(' L')
    const path = `M${topPoints} L${bottomPoints} Z`
    return { cat, path }
  })

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full" preserveAspectRatio="none">
        {bands.map(({ cat, path }) => (
          <path key={cat.name} d={path} fill={cat.color} opacity={0.85} />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {categories.map((c) => (
          <span key={c.name} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  )
}
