import { File, FileCode, FileImage, FileText, FileXls, FileZip } from '../../src/icons/phosphor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cn } from '../../src/lib/utils'
import { hexToHsv, hsvToHex, normalizeHex } from '../../src/utils/color'
import { ICON_CATALOG, iconComponent, searchIcons, suggestedColor } from '../../src/icons/catalog'
import { ICON_COMPONENTS } from '../../src/icons/registry'
import { columnAccentClass, columnAccentColor, guessColumnIcon } from '../../src/utils/columnStyle'
import { formatDeadline, getDeadlineStatus } from '../../src/utils/deadline'
import { columnDndId, parseDndId, taskDndId } from '../../src/utils/dnd'
import { cleanDocUrls, docUrlHref, sameDocUrls } from '../../src/utils/docLinks'
import { formatFileSize } from '../../src/utils/fileSize'
import { fileExtension, fileTypeIcon } from '../../src/utils/fileType'
import { formatHours } from '../../src/utils/hours'
import * as filters from '../../src/utils/taskFilters'

describe('color', () => {
  it.each([
    ['#abc', '#aabbcc'],
    ['ABC', '#aabbcc'],
    [' #A855F7 ', '#a855f7'],
    ['a855f7', '#a855f7'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected)
  })

  it.each(['', '#12', '#12345', '#1234567', 'red', '#ggg', 'javascript:alert(1)'])('rejects %s', (input) => {
    expect(normalizeHex(input)).toBeNull()
  })

  it.each(['#000000', '#ffffff', '#ef4444', '#22c55e', '#6366f1', '#a855f7', '#7e22ce', '#f59e0b'])(
    'round-trips %s through HSV',
    (hex) => {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex)
    },
  )

  it('converts known HSV values', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000')
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00')
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff')
    expect(hexToHsv('#808080')).toEqual({ h: 0, s: 0, v: 128 / 255 })
  })
})

describe('docLinks', () => {
  it('trims and drops blank links', () => {
    expect(cleanDocUrls([' https://a ', '', '   ', 'b'])).toEqual(['https://a', 'b'])
  })

  it('compares link lists ignoring blanks and whitespace but not order', () => {
    expect(sameDocUrls(['https://a', ''], [' https://a'])).toBe(true)
    expect(sameDocUrls(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameDocUrls(['a'], ['a', 'b'])).toBe(false)
  })

  it.each([
    ['https://wiki/page', 'https://wiki/page'],
    ['HTTP://wiki', 'HTTP://wiki'],
    ['confluence.example.com/x', 'https://confluence.example.com/x'],
    ['  notion.so/p  ', 'https://notion.so/p'],
  ])('builds a safe href for %s', (input, expected) => {
    expect(docUrlHref(input)).toBe(expected)
  })

  it.each(['', '   ', 'javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd'])(
    'refuses to link %s',
    (input) => {
      expect(docUrlHref(input)).toBeNull()
    },
  )
})

describe('dnd ids', () => {
  it('round-trips column and task ids', () => {
    expect(parseDndId(columnDndId(3))).toEqual({ type: 'column', id: 3 })
    expect(parseDndId(taskDndId(42))).toEqual({ type: 'task', id: 42 })
  })

  it.each(['other-1', 'task-abc', 'task', 42])('rejects %s', (raw) => {
    expect(parseDndId(raw)).toBeNull()
  })
})

describe('columnStyle', () => {
  it.each([
    ['Backlog', 'tray'],
    ['Analysis', 'magnifying-glass'],
    ['In Progress', 'barricade'],
    ['QA', 'flask'],
    ['Code review', 'eye'],
    ['Ready to deploy', 'package'],
    ['Blocked', 'pause-circle'],
    ['Completed', 'check-circle'],
    ['Cancelled', 'skip-forward'],
    ['Ideas', 'kanban'],
  ])('guesses the %s column icon', (name, icon) => {
    expect(guessColumnIcon(name)).toBe(icon)
    expect(ICON_COMPONENTS[icon]).toBeDefined()
  })

  it('cycles accent colors by position', () => {
    expect(columnAccentClass(0)).toBe(columnAccentClass(6))
    expect(columnAccentClass(0)).not.toBe(columnAccentClass(1))
    expect(columnAccentColor(0)).toBe(columnAccentColor(6))
    expect(columnAccentColor(1)).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [25 * 1024 * 1024, '25.0 MB'],
  ])('formats %d bytes', (bytes, text) => {
    expect(formatFileSize(bytes)).toBe(text)
  })
})

describe('deadline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [null, 'none'],
    ['2026-06-14', 'overdue'],
    ['2026-06-15', 'soon'],
    ['2026-06-17', 'soon'],
    ['2026-06-18', 'normal'],
  ])('classifies %s as %s', (deadline, status) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12))
    expect(getDeadlineStatus(deadline)).toBe(status)
  })

  it('formats a short date', () => {
    expect(formatDeadline('2026-06-15')).toMatch(/15/)
  })
})

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    const hidden = false
    expect(cn('px-2', hidden && 'hidden', 'px-4')).toBe('px-4')
  })
})

describe('task filter sentinels', () => {
  it('never collide within the same query parameter', () => {
    expect(filters.NO_TAG_FILTER_ID).not.toBe(filters.IMPOSSIBLE_TAG_ID)
    expect(filters.NO_TYPE_FILTER_ID).not.toBe(filters.IMPOSSIBLE_TYPE_ID)
    expect(filters.NO_REPORTER_FILTER_ID).not.toBe(filters.IMPOSSIBLE_REPORTER_ID)
  })

  it('use negative ids so they cannot match real records', () => {
    for (const value of Object.values(filters)) expect(value).toBeLessThan(0)
  })
})

describe('formatHours', () => {
  it.each([
    [2, '2h'],
    [3.5, '3.5h'],
    [1.25, '1.25h'],
    [0.333333, '0.33h'],
    [7.1 + 0.2, '7.3h'],
  ])('formats %d as %s', (hours, text) => {
    expect(formatHours(hours)).toBe(text)
  })
})

describe('file types', () => {
  it.each([
    ['report.PDF', 'pdf', FileText],
    ['photo.jpeg', 'jpeg', FileImage],
    ['data.xlsx', 'xlsx', FileXls],
    ['logs.tar.gz', 'gz', FileZip],
    ['query.sql', 'sql', FileCode],
    ['README', '', File],
    ['.env', '', File],
    ['weird.xyz', 'xyz', File],
  ])('%s → extension %s', (name, extension, icon) => {
    expect(fileExtension(name)).toBe(extension)
    expect(fileTypeIcon(name)).toBe(icon)
  })
})

describe('icon catalog', () => {
  it('has a component for every icon and unique keys', () => {
    const keys = ICON_CATALOG.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(ICON_COMPONENTS[key]).toBeDefined()
    expect(Object.keys(ICON_COMPONENTS).sort()).toEqual([...keys].sort())
  })

  it('finds icons by name, label or keyword, combining words', () => {
    expect(searchIcons('bug').map((e) => e.key)).toContain('bug')
    expect(searchIcons('deploy').map((e) => e.key)).toEqual(expect.arrayContaining(['package', 'rocket-launch']))
    expect(searchIcons('  URGENT ').map((e) => e.key)).toEqual(['fire'])
    expect(searchIcons('cloud aws').map((e) => e.key)).toEqual(['cloud'])
    expect(searchIcons('zzz-nothing')).toEqual([])
    expect(searchIcons('')).toHaveLength(ICON_CATALOG.length)
  })

  it('suggests a color for meaningful icons only', () => {
    expect(suggestedColor('bug')).toBe('#ef4444')
    expect(suggestedColor('snowflake')).toBe('#06b6d4')
    expect(suggestedColor('folder')).toBeNull()
    expect(suggestedColor('unknown')).toBeNull()
  })

  it('falls back to a neutral icon for unknown names', () => {
    expect(iconComponent('does-not-exist')).toBe(iconComponent(null))
    expect(iconComponent('bug')).toBe(ICON_COMPONENTS.bug)
  })
})
