type Series = { name: string; color: string; data: Array<{ date: string; value: number | null }> }

export default function MultiLineChart({
  series,
  formatValue,
}: {
  series: Series[]
  formatValue: (v: number) => string
}) {
  const width = 800
  const height = 220
  const padding = 10

  const allValues = series.flatMap((s) => s.data.map((d) => d.value)).filter((v): v is number => v !== null)
  if (allValues.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Pas encore assez de données pour ce graphique.</p>
  }
  const min = Math.min(...allValues, 0)
  const max = Math.max(...allValues, 0)
  const range = max - min || 1
  const n = series[0]?.data.length ?? 0

  function coords(data: Array<{ value: number | null }>) {
    return data.map((d, i) => {
      const x = padding + (i / (n - 1 || 1)) * (width - padding * 2)
      const y =
        d.value === null ? null : height - padding - ((d.value - min) / range) * (height - padding * 2)
      return { x, y }
    })
  }

  function pathFor(data: Array<{ value: number | null }>) {
    const pts = coords(data)
    let path = ''
    let drawing = false
    pts.forEach((p) => {
      if (p.y === null) {
        drawing = false
        return
      }
      path += `${drawing ? 'L' : 'M'}${p.x},${p.y} `
      drawing = true
    })
    return path.trim()
  }

  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2)

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full" preserveAspectRatio="none">
        {min < 0 && max > 0 && (
          <line
            x1={padding}
            x2={width - padding}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        )}
        {series.map((s) => (
          <path key={s.name} d={pathFor(s.data)} fill="none" stroke={s.color} strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s) => {
          const lastPoint = [...s.data].reverse().find((d) => d.value !== null)
          return (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
              {lastPoint && lastPoint.value !== null ? ` · ${formatValue(lastPoint.value)}` : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
