import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/client'
import { ColorSwatches } from '../../src/components/common/ColorSwatches'
import { ConfirmDialog } from '../../src/components/common/ConfirmDialog'
import { IconPicker } from '../../src/components/common/IconPicker'
import { MultiListbox } from '../../src/components/common/MultiListbox'
import { SearchFilterBar, type TaskFiltersState } from '../../src/components/common/SearchFilterBar'
import { AttachmentPreview } from '../../src/components/task/AttachmentPreview'
import { AttachmentRow } from '../../src/components/task/AttachmentRow'
import { ChecklistPanel } from '../../src/components/task/ChecklistPanel'
import { DocLinksEditor } from '../../src/components/task/DocLinksEditor'
import { ReporterPicker } from '../../src/components/task/ReporterPicker'
import { TextColorPicker } from '../../src/components/task/TextColorPicker'
import { TimeTrackingPanel } from '../../src/components/task/TimeTrackingPanel'
import type { ChecklistItem, Priority, Reporter, Tag, TaskType, TimeEntry } from '../../src/types'

function Stateful<T>({ initial, onChange, children }: {
  initial: T
  onChange?: (value: T) => void
  children: (value: T, setValue: (value: T) => void) => ReactNode
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      {children(value, (next) => {
        setValue(next)
        onChange?.(next)
      })}
    </>
  )
}

describe('DocLinksEditor', () => {
  it('starts with one empty row and grows only when the last row is filled', async () => {
    const onChange = vi.fn()
    render(
      <Stateful initial={[] as string[]} onChange={onChange}>
        {(urls, set) => <DocLinksEditor urls={urls} onChange={set} />}
      </Stateful>,
    )
    const add = screen.getByRole('button', { name: /add link/i })
    expect(add).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Documentation link 1'), 'wiki.local/a')
    expect(add).toBeEnabled()
    await userEvent.click(add)
    expect(screen.getByLabelText('Documentation link 2')).toHaveValue('')
    expect(add).toBeDisabled()
    expect(onChange).toHaveBeenLastCalledWith(['wiki.local/a', ''])
  })

  it('opens http(s) links in a new tab, prefixes bare hosts and never links unsafe schemes', () => {
    render(<DocLinksEditor urls={['https://a.dev', 'b.dev/x', 'javascript:alert(1)']} onChange={() => {}} />)
    const links = screen.getAllByRole('link', { name: 'Open documentation link' })
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://a.dev', 'https://b.dev/x'])
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noreferrer')
    }
  })

  it('removes a link', async () => {
    const onChange = vi.fn()
    render(<DocLinksEditor urls={['a', 'b']} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove documentation link' })[0])
    expect(onChange).toHaveBeenCalledWith(['b'])
  })
})

describe('TextColorPicker', () => {
  it('applies a preset swatch', async () => {
    const onPick = vi.fn()
    render(<TextColorPicker onPick={onPick} onReset={() => {}} />)
    await userEvent.click(screen.getByLabelText('Set text color #ef4444'))
    expect(onPick).toHaveBeenCalledWith('#ef4444')
  })

  it('accepts a typed hex code with Apply or Enter, normalizing short codes', async () => {
    const onPick = vi.fn()
    render(<TextColorPicker onPick={onPick} onReset={() => {}} />)
    const input = screen.getByLabelText('Hex color code')

    await userEvent.clear(input)
    await userEvent.type(input, '#0f0')
    await userEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(onPick).toHaveBeenLastCalledWith('#00ff00')

    await userEvent.clear(input)
    await userEvent.type(input, '123abc{Enter}')
    expect(onPick).toHaveBeenLastCalledWith('#123abc')
  })

  it('blocks invalid codes', async () => {
    const onPick = vi.fn()
    render(<TextColorPicker onPick={onPick} onReset={() => {}} />)
    const input = screen.getByLabelText('Hex color code')
    await userEvent.clear(input)
    await userEvent.type(input, 'red{Enter}')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('starts from the current text color and supports keyboard adjustments', async () => {
    render(<TextColorPicker initialColor="#ff0000" onPick={() => {}} onReset={() => {}} />)
    const hue = screen.getByRole('slider', { name: 'Hue' })
    expect(hue).toHaveAttribute('aria-valuenow', '0')

    hue.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(hue).toHaveAttribute('aria-valuenow', '1')
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(hue).toHaveAttribute('aria-valuenow', '11')

    const area = screen.getByRole('slider', { name: 'Saturation and brightness' })
    area.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(area).toHaveAttribute('aria-valuetext', 'Saturation 100%, brightness 99%')
  })

  it('removes the color', async () => {
    const onReset = vi.fn()
    render(<TextColorPicker onPick={() => {}} onReset={onReset} />)
    await userEvent.click(screen.getByLabelText('Remove text color'))
    expect(onReset).toHaveBeenCalled()
  })
})

describe('MultiListbox', () => {
  const options = [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two' },
    { value: 3, label: 'Three' },
  ]

  function renderListbox(initial: number[]) {
    const onChange = vi.fn()
    render(
      <Stateful initial={initial} onChange={onChange}>
        {(values, set) => <MultiListbox values={values} onChange={set} options={options} placeholder="All items" />}
      </Stateful>,
    )
    return onChange
  }

  it('summarizes the selection on the trigger', async () => {
    renderListbox([1, 2, 3])
    const trigger = screen.getByRole('button', { name: /all items/i })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('option', { name: 'Two' }))
    expect(trigger).toHaveTextContent('2 selected')
    await userEvent.click(screen.getByRole('option', { name: 'Three' }))
    expect(trigger).toHaveTextContent('One')
    await userEvent.click(screen.getByRole('option', { name: 'One' }))
    expect(trigger).toHaveTextContent('None selected')
  })

  it('selects and clears everything with Select all, and closes on Escape', async () => {
    const onChange = renderListbox([1])
    await userEvent.click(screen.getByRole('button', { name: 'One' }))
    await userEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(onChange).toHaveBeenLastCalledWith([1, 2, 3])
    await userEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(onChange).toHaveBeenLastCalledWith([])

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('SearchFilterBar', () => {
  const priorities = [
    { id: 1, name: 'High', icon: 'lightning', color: '#f97316', is_hidden: false },
    { id: 2, name: 'Secret', icon: 'lock', color: '#000000', is_hidden: true },
  ] as Priority[]
  const tags = [{ id: 10, name: 'ops', icon: 'tag', color: '#06b6d4' }] as Tag[]
  const taskTypes = [{ id: 20, name: 'Bug', icon: 'bug', color: '#ef4444' }] as TaskType[]
  const reporters = [{ id: 30, name: 'Ann' }] as Reporter[]
  const everything: TaskFiltersState = {
    search: '',
    priorityIds: [1],
    tagIds: [-1, 10],
    typeIds: [-1, 20],
    reporterIds: [-1, 30],
  }

  function renderBar(initial: TaskFiltersState) {
    const onChange = vi.fn()
    render(
      <Stateful initial={initial} onChange={onChange}>
        {(filters, set) => (
          <SearchFilterBar
            filters={filters}
            onChange={set}
            tags={tags}
            priorities={priorities}
            taskTypes={taskTypes}
            reporters={reporters}
          />
        )}
      </Stateful>,
    )
    return onChange
  }

  it('offers every filter, with "none" options and without hidden priorities', async () => {
    renderBar(everything)
    for (const label of ['All priorities', 'All tags', 'All types', 'All reporters']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole('button', { name: /all priorities/i }))
    expect(screen.queryByRole('option', { name: /secret/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /all types/i }))
    expect(screen.getByRole('option', { name: /unassigned/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /all reporters/i }))
    expect(screen.getByRole('option', { name: /no reporter/i })).toBeInTheDocument()
  })

  it('shows Clear only when narrowed, and Clear resets every filter', async () => {
    const onChange = renderBar(everything)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Search tasks'), 'bug')
    await userEvent.click(screen.getByRole('button', { name: /all reporters/i }))
    await userEvent.click(screen.getByRole('option', { name: 'Ann' }))
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))

    expect(onChange).toHaveBeenLastCalledWith(everything)
    expect(screen.getByLabelText('Search tasks')).toHaveValue('')
  })
})

describe('ConfirmDialog', () => {
  it('focuses Cancel, confirms, and cancels on Escape', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="Delete?"
        message="Gone forever"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Delete?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('ChecklistPanel', () => {
  function renderChecklist(initial: ChecklistItem[]) {
    const onChange = vi.fn()
    render(
      <Stateful initial={initial} onChange={onChange}>
        {(items, set) => <ChecklistPanel items={items} onItemsChange={set} />}
      </Stateful>,
    )
    return onChange
  }

  it('adds trimmed items with Enter and ignores blanks', async () => {
    const onChange = renderChecklist([])
    const input = screen.getByPlaceholderText(/add checklist item/i)
    await userEvent.type(input, '   {Enter}')
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.type(input, '  Write tests  {Enter}')
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ text: 'Write tests', is_done: false })])
    expect(onChange.mock.lastCall?.[0][0].id).toBeLessThan(0)
  })

  it('toggles, reorders and deletes items', async () => {
    const onChange = renderChecklist([
      { id: 1, text: 'first', is_done: false, position: 0 },
      { id: 2, text: 'second', is_done: false, position: 1 },
    ] as ChecklistItem[])

    await userEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onChange.mock.lastCall?.[0][0].is_done).toBe(true)

    await userEvent.click(screen.getAllByLabelText('Move down')[0])
    expect(onChange.mock.lastCall?.[0].map((i: ChecklistItem) => i.text)).toEqual(['second', 'first'])

    await userEvent.click(screen.getAllByLabelText('Delete item')[0])
    expect(onChange.mock.lastCall?.[0].map((i: ChecklistItem) => i.text)).toEqual(['first'])
  })

  it('cancels an edit with Escape without closing the surrounding window', async () => {
    const outerEscape = vi.fn()
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && outerEscape()
    document.addEventListener('keydown', onKeyDown)
    const onChange = renderChecklist([{ id: 1, text: 'original', is_done: false, position: 0 }] as ChecklistItem[])

    await userEvent.click(screen.getByLabelText('Edit item'))
    const editor = screen.getByDisplayValue('original')
    await userEvent.type(editor, ' changed{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    expect(outerEscape).not.toHaveBeenCalled()
    document.removeEventListener('keydown', onKeyDown)
  })
})

describe('TimeTrackingPanel', () => {
  it('adds entries, rejects non-positive hours, and shows the total', async () => {
    const onChange = vi.fn()
    render(
      <Stateful initial={[] as TimeEntry[]} onChange={onChange}>
        {(entries, set) => <TimeTrackingPanel entries={entries} onEntriesChange={set} />}
      </Stateful>,
    )
    const hours = screen.getByLabelText('Hours for new entry')

    await userEvent.type(hours, '0{Enter}')
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Note for new entry'), 'review')
    await userEvent.clear(hours)
    await userEvent.type(hours, '1.5{Enter}')
    await userEvent.type(hours, '2{Enter}')

    expect(onChange.mock.lastCall?.[0]).toHaveLength(2)
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ hours: 1.5, note: 'review' })
    expect(screen.getByText(/3\.5h logged total/)).toBeInTheDocument()
  })
})

describe('ReporterPicker', () => {
  const reporters = [{ id: 1, name: 'Ann' }] as Reporter[]

  it('creates a reporter inline and selects it', async () => {
    const onChange = vi.fn()
    const onCreate = vi.fn(async (name: string) => ({ id: 2, name }))
    render(<ReporterPicker reporters={reporters} selectedId={null} onChange={onChange} onCreateReporter={onCreate} />)

    await userEvent.click(screen.getByLabelText('Add a new reporter'))
    await userEvent.type(screen.getByPlaceholderText('New reporter name'), '  Bob  {Enter}')

    expect(onCreate).toHaveBeenCalledWith('Bob')
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(2))
    expect(screen.queryByPlaceholderText('New reporter name')).not.toBeInTheDocument()
  })

  it('selects the existing reporter instead of creating a duplicate', async () => {
    const onChange = vi.fn()
    const onCreate = vi.fn()
    render(<ReporterPicker reporters={reporters} selectedId={null} onChange={onChange} onCreateReporter={onCreate} />)

    await userEvent.click(screen.getByLabelText('Add a new reporter'))
    await userEvent.type(screen.getByPlaceholderText('New reporter name'), ' ann {Enter}')

    expect(onChange).toHaveBeenCalledWith(1)
    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('New reporter name')).not.toBeInTheDocument()
  })

  it('closes the creation field with Escape and discards the draft', async () => {
    render(<ReporterPicker reporters={reporters} selectedId={null} onChange={() => {}} onCreateReporter={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Add a new reporter'))
    await userEvent.type(screen.getByPlaceholderText('New reporter name'), 'Draft{Escape}')
    expect(screen.queryByPlaceholderText('New reporter name')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Add a new reporter'))
    expect(screen.getByPlaceholderText('New reporter name')).toHaveValue('')
  })

  it('shows the server error when creation fails', async () => {
    const onCreate = vi.fn(async () => {
      throw new ApiError(409, 'A reporter with this name already exists')
    })
    render(<ReporterPicker reporters={reporters} selectedId={1} onChange={() => {}} onCreateReporter={onCreate} />)

    await userEvent.click(screen.getByLabelText('Add a new reporter'))
    await userEvent.type(screen.getByPlaceholderText('New reporter name'), 'Zed{Enter}')
    expect(await screen.findByText('A reporter with this name already exists')).toBeInTheDocument()
  })
})

describe('AttachmentRow', () => {
  it('makes an uploaded file an explicit download link', () => {
    render(
      <ul>
        <AttachmentRow filename="spec.pdf" sizeBytes={2048} downloadUrl="/api/x/download" onRemove={() => {}} />
      </ul>,
    )
    const link = screen.getByRole('link', { name: 'Download spec.pdf' })
    expect(link).toHaveAttribute('href', '/api/x/download')
    expect(link).toHaveAttribute('download', 'spec.pdf')
    expect(link).toHaveTextContent('Download')
    expect(screen.getByText('PDF · 2.0 KB')).toBeInTheDocument()
  })

  it('marks files that are not uploaded yet and lets you remove them', async () => {
    const onRemove = vi.fn()
    render(
      <ul>
        <AttachmentRow filename="draft" sizeBytes={10} onRemove={onRemove} />
      </ul>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Pending upload')).toBeInTheDocument()
    expect(screen.getByText('10 B')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove attachment draft' }))
    expect(onRemove).toHaveBeenCalled()
  })
})

describe('AttachmentRow with preview', () => {
  it('opens the preview from the row and keeps a separate download link', async () => {
    const onPreview = vi.fn()
    render(
      <ul>
        <AttachmentRow
          filename="photo.png"
          sizeBytes={100}
          downloadUrl="/api/x/download"
          onPreview={onPreview}
          onRemove={() => {}}
        />
      </ul>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Preview photo.png' }))
    expect(onPreview).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Download photo.png' })).toHaveAttribute('download', 'photo.png')
  })
})

describe('AttachmentPreview', () => {
  function renderPreview(kind: 'image' | 'pdf' | 'text', onClose = vi.fn()) {
    render(
      <AttachmentPreview
        filename={`file.${kind}`}
        kind={kind}
        previewUrl="/api/x/preview"
        downloadUrl="/api/x/download"
        onClose={onClose}
      />,
    )
    return onClose
  }

  it('shows images and PDFs from the preview URL', () => {
    renderPreview('image')
    expect(screen.getByRole('img', { name: 'file.image' })).toHaveAttribute('src', '/api/x/preview')
    cleanup()
    renderPreview('pdf')
    expect(screen.getByTitle('file.pdf')).toHaveAttribute('src', '/api/x/preview')
  })

  it('shows text files as plain text, never as HTML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<b>not bold</b>\nline 2' })))
    renderPreview('text')
    const text = await screen.findByText(/not bold/)
    expect(text.tagName).toBe('PRE')
    expect(text.querySelector('b')).toBeNull()
  })

  it('warns when a text file is too large to show completely', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => 'x'.repeat(200_001) })))
    renderPreview('text')
    expect(await screen.findByText(/showing the first part/i)).toBeInTheDocument()
  })

  it('explains when the preview cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, statusText: 'Not Found' })))
    renderPreview('text')
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the preview')
  })

  it('offers download and closes with Escape, the X button or a click outside', async () => {
    const onClose = renderPreview('image')
    const dialog = screen.getByRole('dialog', { name: 'Preview of file.image' })
    expect(within(dialog).getByRole('link', { name: /download/i })).toHaveAttribute('href', '/api/x/download')

    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close preview' }))
    await userEvent.click(dialog.parentElement!)
    await userEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

describe('IconPicker', () => {
  function renderPicker() {
    const onChange = vi.fn()
    render(
      <Stateful initial="tag" onChange={onChange}>
        {(icon, set) => <IconPicker value={icon} onChange={set} color="#6366f1" label="Icon for new tag" />}
      </Stateful>,
    )
    return onChange
  }

  it('shows the current icon and picks a new one from the grid', async () => {
    const onChange = renderPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Icon for new tag: Tag' }))
    const panel = screen.getByRole('dialog', { name: 'Icon for new tag' })
    expect(within(panel).getByRole('button', { name: 'Tag' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(panel).getByRole('button', { name: 'Bug' }))
    expect(onChange).toHaveBeenCalledWith('bug')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Icon for new tag: Bug' })).toHaveFocus()
  })

  it('filters icons by search and explains when nothing matches', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: /icon for new tag/i }))
    await userEvent.type(screen.getByLabelText('Search icons'), 'database')
    const panel = screen.getByRole('dialog')
    expect(within(panel).getAllByRole('button')).toHaveLength(1)
    await userEvent.clear(screen.getByLabelText('Search icons'))
    await userEvent.type(screen.getByLabelText('Search icons'), 'qqq')
    expect(within(panel).getByText(/no icons match/i)).toBeInTheDocument()
  })

  it('closes with Escape without closing the window it lives in', async () => {
    const outerEscape = vi.fn()
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && outerEscape()
    document.addEventListener('keydown', onKeyDown)
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: /icon for new tag/i }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outerEscape).not.toHaveBeenCalled()
    document.removeEventListener('keydown', onKeyDown)
  })
})

describe('ColorSwatches', () => {
  function renderSwatches(initial: string) {
    const onChange = vi.fn()
    render(
      <Stateful initial={initial} onChange={onChange}>
        {(color, set) => <ColorSwatches value={color} onChange={set} />}
      </Stateful>,
    )
    return onChange
  }

  it('picks a preset color', async () => {
    const onChange = renderSwatches('#ef4444')
    expect(screen.getByLabelText('Choose color #ef4444')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByLabelText('Choose color #22c55e'))
    expect(onChange).toHaveBeenLastCalledWith('#22c55e')
  })

  it('opens the full picker for a custom color and marks it as selected', async () => {
    const onChange = renderSwatches('#ef4444')
    await userEvent.click(screen.getByRole('button', { name: 'Custom color' }))
    const panel = screen.getByRole('dialog', { name: 'Custom color' })
    expect(within(panel).getByRole('slider', { name: 'Hue' })).toBeInTheDocument()

    const hex = within(panel).getByLabelText('Hex color code')
    await userEvent.clear(hex)
    await userEvent.type(hex, '#123abc{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('#123abc')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom color #123abc' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Choose color #ef4444')).toHaveAttribute('aria-pressed', 'false')
  })

  it('closes the custom picker with Escape without closing the surrounding window', async () => {
    const outerEscape = vi.fn()
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && outerEscape()
    document.addEventListener('keydown', onKeyDown)
    renderSwatches('#ef4444')
    await userEvent.click(screen.getByRole('button', { name: 'Custom color' }))
    within(screen.getByRole('dialog')).getByLabelText('Hex color code').focus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outerEscape).not.toHaveBeenCalled()
    document.removeEventListener('keydown', onKeyDown)
  })

  it('disables every option when the item cannot be edited', () => {
    render(<ColorSwatches value="#ef4444" onChange={() => {}} disabled />)
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  })
})

describe('DocLinksEditor layout', () => {
  it('lets a single empty field use the whole row, and shows actions once there is a link', async () => {
    render(
      <Stateful initial={[] as string[]}>
        {(urls, set) => <DocLinksEditor urls={urls} onChange={set} />}
      </Stateful>,
    )
    expect(screen.queryByRole('button', { name: 'Remove documentation link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open documentation link' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Documentation link 1'), 'wiki.local/page')
    expect(screen.getByRole('link', { name: 'Open documentation link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove documentation link' })).toBeInTheDocument()
  })
})
