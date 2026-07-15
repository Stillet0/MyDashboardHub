import { useMemo } from 'react'
import { layoutGraph } from '../../lib/graphLayout'
import type { Note, NoteEdge } from '../../lib/notes'

type Props = {
  notes: Note[]
  edges: NoteEdge[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const WIDTH = 800
const HEIGHT = 460

const SPACE_COLOR: Record<Note['space'], string> = {
  Pro: '#5b8ef4',
  Perso: 'var(--gold)',
}

const EDGE_COLOR: Record<NoteEdge['kind'], string> = {
  link: 'var(--gold)',
  tag: '#5b8ef4',
  keyword: 'var(--text-faint)',
}

export default function ConstellationView({ notes, edges, selectedId, onSelect }: Props) {
  const positions = useMemo(() => {
    const ids = notes.map((n) => n.id)
    const links = edges.map((e) => ({ source: e.a, target: e.b, weight: e.weight }))
    return layoutGraph(ids, links, WIDTH, HEIGHT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.map((n) => n.id).join(','), edges.length])

  const degree = useMemo(() => {
    const m = new Map<string, number>()
    edges.forEach((e) => {
      m.set(e.a, (m.get(e.a) ?? 0) + 1)
      m.set(e.b, (m.get(e.b) ?? 0) + 1)
    })
    return m
  }, [edges])

  if (notes.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
        Ajoute des notes pour voir apparaître ta constellation.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" style={{ maxHeight: '65vh' }}>
        {edges.map((e, i) => {
          const pa = positions.get(e.a)
          const pb = positions.get(e.b)
          if (!pa || !pb) return null
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={EDGE_COLOR[e.kind]}
              strokeWidth={e.kind === 'link' ? 1.5 : 1}
              opacity={e.kind === 'keyword' ? 0.25 + e.weight * 0.3 : 0.5}
            />
          )
        })}
        {notes.map((n) => {
          const p = positions.get(n.id)
          if (!p) return null
          const r = 6 + Math.min(10, (degree.get(n.id) ?? 0) * 1.5)
          const selected = n.id === selectedId
          return (
            <g key={n.id} onClick={() => onSelect(n.id)} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={SPACE_COLOR[n.space]}
                stroke={selected ? 'var(--text)' : n.pinned ? 'var(--red)' : 'none'}
                strokeWidth={selected ? 2.5 : 2}
              />
              <text x={p.x} y={p.y + r + 12} textAnchor="middle" className="select-none" style={{ fontSize: 10, fill: 'var(--text-muted)' }}>
                {n.title.length > 18 ? n.title.slice(0, 17) + '…' : n.title}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-3 border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--text-faint)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: SPACE_COLOR.Pro }} /> Pro
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: SPACE_COLOR.Perso }} /> Perso
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3" style={{ background: EDGE_COLOR.link }} /> Lien explicite
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3" style={{ background: EDGE_COLOR.tag }} /> Tag commun
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3" style={{ background: EDGE_COLOR.keyword }} /> Vocabulaire proche
        </span>
      </div>
    </div>
  )
}
