import { Flag, Search, Tag as TagIcon, TagsIcon, X } from 'lucide-react'
import type { Priority, Tag } from '../../types'
import { NO_TAG_FILTER_ID } from '../../utils/taskFilters'
import { Button } from '../ui/button'
import { MultiListbox } from './MultiListbox'

export interface TaskFiltersState {
  search: string
  priorityIds: number[]
  tagIds: number[]
}

interface SearchFilterBarProps {
  filters: TaskFiltersState
  onChange: (filters: TaskFiltersState) => void
  tags: Tag[]
  priorities: Priority[]
}

const inputClasses =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20'

const labelClasses = 'mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400'

/** True once the selection has been narrowed from "every id checked" —
 * that's the seeded default (see BoardPage), so an exact-match compare
 * (not just non-empty) is what tells a real filter apart from the default. */
function isNarrowedFrom(selected: number[], allIds: number[]): boolean {
  return selected.length !== allIds.length || !allIds.every((id) => selected.includes(id))
}

export function SearchFilterBar({ filters, onChange, tags, priorities }: SearchFilterBarProps) {
  const tagOptions = [
    {
      value: NO_TAG_FILTER_ID,
      label: (
        <span className="flex items-center gap-1.5">
          <TagsIcon className="h-3.5 w-3.5" strokeWidth={2} /> No tag
        </span>
      ),
    },
    ...tags.map((tag) => ({ value: tag.id, label: tag.emoji ? `${tag.emoji} ${tag.name}` : tag.name })),
  ]
  const priorityOptions = priorities
    .filter((p) => !p.is_hidden)
    .map((p) => ({ value: p.id, label: `${p.emoji} ${p.name}` }))

  const allPriorityIds = priorityOptions.map((o) => o.value)
  const allTagIds = tagOptions.map((o) => o.value)
  const hasActiveFilters =
    Boolean(filters.search) ||
    isNarrowedFrom(filters.priorityIds, allPriorityIds) ||
    isNarrowedFrom(filters.tagIds, allTagIds)

  return (
    <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-soft dark:border-slate-700 dark:bg-slate-800/60">
      <span className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Filter tasks</span>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClasses} htmlFor="filter-search">
            <Search className="h-3.5 w-3.5" strokeWidth={2} /> Search
          </label>
          <input
            id="filter-search"
            type="text"
            placeholder="Title, description, notes..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className={`${inputClasses} w-64`}
          />
        </div>
        <div>
          <label className={labelClasses} htmlFor="filter-priority">
            <Flag className="h-3.5 w-3.5" strokeWidth={2} /> Priority
          </label>
          <MultiListbox
            id="filter-priority"
            values={filters.priorityIds}
            onChange={(priorityIds) => onChange({ ...filters, priorityIds })}
            options={priorityOptions}
            placeholder="All priorities"
          />
        </div>
        <div>
          <label className={labelClasses} htmlFor="filter-tag">
            <TagIcon className="h-3.5 w-3.5" strokeWidth={2} /> Tag
          </label>
          <MultiListbox
            id="filter-tag"
            values={filters.tagIds}
            onChange={(tagIds) => onChange({ ...filters, tagIds })}
            options={tagOptions}
            placeholder="All tags"
          />
        </div>
        {hasActiveFilters && (
          <div>
            <span className={`${labelClasses} invisible`}>Clear</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ search: '', priorityIds: allPriorityIds, tagIds: allTagIds })}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} /> Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
