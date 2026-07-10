type Point = { label: string; value: number }

export default function EvolutionChart({ points }: { points: Point[] }) {
  const width = 800
  const height = 180
  const padding = 8
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((p.value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[140px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="evo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#evo-fill)" />
      <path d={linePath} fill="none" stroke="var(--emerald)" strokeWidth="2" />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 4 : 0}
          fill="var(--emerald)"
        />
      ))}
    </svg>
  )
}
