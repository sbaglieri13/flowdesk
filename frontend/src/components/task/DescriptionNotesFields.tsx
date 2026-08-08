import { FileText, StickyNote } from 'lucide-react'
import type { ComponentType } from 'react'
import { MarkdownEditor } from './MarkdownEditor'

type Section = 'description' | 'notes'

interface DescriptionNotesFieldsProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
  description: string
  onDescriptionChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  defaultMode?: 'edit' | 'preview'
  /** Renders a "Save" button under the active editor when provided (edit-modal usage). */
  renderSaveButton?: (section: Section) => React.ReactNode
}

const TABS: [Section, string, ComponentType<{ className?: string; strokeWidth?: number }>][] = [
  ['description', 'Description', FileText],
  ['notes', 'Notes', StickyNote],
]

export function DescriptionNotesFields({
  activeSection,
  onSectionChange,
  description,
  onDescriptionChange,
  notes,
  onNotesChange,
  defaultMode,
  renderSaveButton,
}: DescriptionNotesFieldsProps) {
  return (
    <>
      <div className="mb-1 flex gap-1">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
              activeSection === id
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'description' ? (
        <>
          <MarkdownEditor
            value={description}
            onChange={onDescriptionChange}
            placeholder="Description (Markdown supported)..."
            defaultMode={defaultMode}
          />
          {renderSaveButton?.('description')}
        </>
      ) : (
        <>
          <MarkdownEditor
            value={notes}
            onChange={onNotesChange}
            placeholder="Extra notes: analysis results, meeting notes, links..."
            defaultMode={defaultMode}
          />
          {renderSaveButton?.('notes')}
        </>
      )}
    </>
  )
}
