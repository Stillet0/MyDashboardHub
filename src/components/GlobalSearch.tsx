import { useState } from 'react'
import { useTasksData } from '../lib/useTasksData'
import { useAgendaData } from '../lib/useAgendaData'
import { useHabitsData } from '../lib/useHabitsData'
import { useCarData } from '../lib/useCarData'
import { useDocumentsData } from '../lib/useDocumentsData'
import { useHealthData } from '../lib/useHealthData'
import { useGoalsData } from '../lib/useGoalsData'
import { useTravelData } from '../lib/useTravelData'
import { useNotesData } from '../lib/useNotesData'
import { buildSearchIndex, searchItems, type SearchModule } from '../lib/searchIndex'

export default function GlobalSearch({ onNavigate }: { onNavigate: (module: SearchModule) => void }) {
  const { data: tasks } = useTasksData()
  const { data: agenda } = useAgendaData()
  const { data: habits } = useHabitsData()
  const { data: car } = useCarData()
  const { data: documents } = useDocumentsData()
  const { data: health } = useHealthData()
  const { data: goals } = useGoalsData()
  const { data: travel } = useTravelData()
  const { data: notes } = useNotesData()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const index = buildSearchIndex({
    tasks: tasks ?? undefined,
    agenda: agenda ?? undefined,
    habits: habits ?? undefined,
    car: car ?? undefined,
    documents: documents ?? undefined,
    health: health ?? undefined,
    goals: goals ?? undefined,
    travel: travel ?? undefined,
    notes: notes ?? undefined,
  })
  const results = searchItems(index, query)

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher…"
        className="w-28 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text)] outline-none transition-all focus:w-56 focus:border-[var(--gold)] sm:w-36"
      />
      {open && query.trim() && (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-72 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
          {results.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-[var(--text-muted)]">Aucun résultat</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onNavigate(r.module)
                  setQuery('')
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
              >
                <span className="truncate text-[var(--text)]">{r.title}</span>
                <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
                  {r.module}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
