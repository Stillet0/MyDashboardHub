import { notesLinkedTo, type Note, type NoteRefModule } from '../lib/notes'

type Props = {
  notes: Note[] | undefined
  module: NoteRefModule
  itemId: string
  onNavigate?: (module: 'Notes') => void
}

/** Petit badge indiquant qu'une ou plusieurs notes sont explicitement rattachées à cet élément. */
export default function LinkedNotesBadge({ notes, module, itemId, onNavigate }: Props) {
  if (!notes) return null
  const linked = notesLinkedTo(notes, module, itemId)
  if (linked.length === 0) return null
  return (
    <button
      onClick={() => onNavigate?.('Notes')}
      title={linked.map((n) => n.title).join(', ')}
      className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
    >
      📝 {linked.length} note{linked.length > 1 ? 's' : ''}
    </button>
  )
}
