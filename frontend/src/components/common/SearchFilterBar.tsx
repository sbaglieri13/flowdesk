import { Flag, ListFilter, Search, Shapes, Tag as TagIcon, TagsIcon, UserRound, UserX, X } from 'lucide-react'
import type { Priority, Reporter, Tag, TaskType } from '../../types'
import { NO_REPORTER_FILTER_ID, NO_TAG_FILTER_ID, NO_TYPE_FILTER_ID } from '../../utils/taskFilters'
import { Button } from '../ui/button'
import { MultiListbox } from './MultiListbox'

export interface TaskFiltersState {
  search: string
  priorityIds: number[]
  tagIds: number[]
  typeIds: number[]
  reporterIds: number[]
}

interface SearchFilterBarProps {
  filters: TaskFiltersState
  onChange: (filters: TaskFiltersState) => void
  tags: Tag[]
  priorities: Priority[]
  taskTypes: TaskType[]
  reporters: Reporter[]
}

function isNarrowedFrom(selected: number[], allIds: number[]): boolean {
  return selected.length !== allIds.length || !allIds.every((id) => selected.includes(id))
}

export function SearchFilterBar({ filters, onChange, tags, priorities, taskTypes, reporters }: SearchFilterBarProps) {
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
  const typeOptions = [
    {
      value: NO_TYPE_FILTER_ID,
      label: (
        <span className="flex items-center gap-1.5">
          <Shapes className="h-3.5 w-3.5" strokeWidth={2} /> Unassigned
        </span>
      ),
    },
    ...taskTypes.map((t) => ({ value: t.id, label: `${t.emoji} ${t.name}` })),
  ]
  const reporterOptions = [
    {
      value: NO_REPORTER_FILTER_ID,
      label: (
        <span className="flex items-center gap-1.5">
          <UserX className="h-3.5 w-3.5" strokeWidth={2} /> No reporter
        </span>
      ),
    },
    ...reporters.map((r) => ({ value: r.id, label: r.name })),
  ]

  const allPriorityIds = priorityOptions.map((o) => o.value)
  const allTagIds = tagOptions.map((o) => o.value)
  const allTypeIds = typeOptions.map((o) => o.value)
  const allReporterIds = reporterOptions.map((o) => o.value)
  const hasActiveFilters =
    Boolean(filters.search) ||
    isNarrowedFrom(filters.priorityIds, allPriorityIds) ||
    isNarrowedFrom(filters.tagIds, allTagIds) ||
    isNarrowedFrom(filters.typeIds, allTypeIds) ||
    isNarrowedFrom(filters.reporterIds, allReporterIds)

  return (
    <div className="flex shrink-0 flex-col justify-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <ListFilter className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            strokeWidth={2}
          />
          <input
            id="filter-search"
            type="text"
            aria-label="Search tasks"
            placeholder="Search title, description, notes…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-64 rounded-lg border border-slate-200 bg-slate-100 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/20"
          />
        </div>
        <MultiListbox
          id="filter-priority"
          values={filters.priorityIds}
          onChange={(priorityIds) => onChange({ ...filters, priorityIds })}
          options={priorityOptions}
          placeholder="All priorities"
          icon={Flag}
        />
        <MultiListbox
          id="filter-tag"
          values={filters.tagIds}
          onChange={(tagIds) => onChange({ ...filters, tagIds })}
          options={tagOptions}
          placeholder="All tags"
          icon={TagIcon}
        />
        <MultiListbox
          id="filter-type"
          values={filters.typeIds}
          onChange={(typeIds) => onChange({ ...filters, typeIds })}
          options={typeOptions}
          placeholder="All types"
          icon={Shapes}
        />
        <MultiListbox
          id="filter-reporter"
          values={filters.reporterIds}
          onChange={(reporterIds) => onChange({ ...filters, reporterIds })}
          options={reporterOptions}
          placeholder="All reporters"
          icon={UserRound}
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                search: '',
                priorityIds: allPriorityIds,
                tagIds: allTagIds,
                typeIds: allTypeIds,
                reporterIds: allReporterIds,
              })
            }
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} /> Clear
          </Button>
        )}
      </div>
    </div>
  )
}
