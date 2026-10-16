import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { card, column, createTask, getTask, gotoBoard, saveTask, unique } from './helpers'

async function idByName(request: APIRequestContext, path: string, name: string): Promise<number> {
  const items: { id: number; name: string }[] = await (await request.get(path)).json()
  return items.find((item) => item.name === name)!.id
}

async function pickIcon(page: Page, scope: Locator, label: string, search: string, option: string) {
  await scope.getByRole('button', { name: new RegExp(`^${label}:`) }).click()
  const panel = page.getByRole('dialog', { name: label })
  await panel.getByLabel('Search icons').fill(search)
  await panel.getByRole('button', { name: option, exact: true }).click()
  await expect(panel).toBeHidden()
}

async function toggleFilterOption(page: Page, trigger: RegExp, option: string | RegExp) {
  await page.getByRole('button', { name: trigger }).click()
  await page.getByRole('option', { name: option }).click()
  await page.keyboard.press('Escape')
}

test.describe('filters', () => {
  let token: string
  let titles: { typed: string; plain: string; tagged: string }

  test.beforeEach(async ({ page, request }) => {
    token = unique('flt').replace(' ', '')
    const reporterId = (await (await request.post('/api/reporters', { data: { name: unique('Filter rep') } })).json()).id
    const tagId = (await (await request.post('/api/tags', { data: { name: unique('ftag'), color: '#22c55e' } })).json()).id
    titles = { typed: `${token} typed`, plain: `${token} plain`, tagged: `${token} tagged` }
    await createTask(request, {
      title: titles.typed,
      type_id: await idByName(request, '/api/task-types', 'Bug'),
      priority_id: await idByName(request, '/api/priorities', 'Urgent'),
      reporter_id: reporterId,
    })
    await createTask(request, { title: titles.plain, priority_id: await idByName(request, '/api/priorities', 'Low') })
    await createTask(request, { title: titles.tagged, tag_ids: [tagId] })
    await gotoBoard(page)
    await page.getByLabel('Search tasks').fill(token)
    await expect(card(page, titles.plain)).toBeVisible()
  })

  async function expectVisible(page: Page, visible: (keyof typeof titles)[]) {
    for (const key of Object.keys(titles) as (keyof typeof titles)[]) {
      if (visible.includes(key)) await expect(card(page, titles[key])).toBeVisible()
      else await expect(card(page, titles[key])).toBeHidden()
    }
  }

  test('search narrows the board to matching tasks', async ({ page }) => {
    await expectVisible(page, ['typed', 'plain', 'tagged'])
    await page.getByLabel('Search tasks').fill(`${token} tagged`)
    await expectVisible(page, ['tagged'])
  })

  test('type filter can hide unassigned tasks', async ({ page }) => {
    await toggleFilterOption(page, /all types/i, /unassigned/i)
    await expectVisible(page, ['typed'])
  })

  test('reporter filter can show only tasks without a reporter', async ({ page }) => {
    await page.getByRole('button', { name: /all reporters/i }).click()
    await page.getByRole('button', { name: /select all/i }).click()
    await page.getByRole('option', { name: /no reporter/i }).click()
    await page.keyboard.press('Escape')
    await expectVisible(page, ['plain', 'tagged'])
  })

  test('priority filter and tag filter work, and Clear restores everything', async ({ page }) => {
    await toggleFilterOption(page, /all priorities/i, /Low/)
    await expectVisible(page, ['typed', 'tagged'])
    await toggleFilterOption(page, /selected/i, /Medium/)
    await expectVisible(page, ['typed'])

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByLabel('Search tasks')).toHaveValue('')
    await page.getByLabel('Search tasks').fill(token)
    await expectVisible(page, ['typed', 'plain', 'tagged'])

    await toggleFilterOption(page, /all tags/i, /no tag/i)
    await expectVisible(page, ['tagged'])
  })

  test('deselecting every option shows nothing', async ({ page }) => {
    await page.getByRole('button', { name: /all types/i }).click()
    await page.getByRole('button', { name: /select all/i }).click()
    await page.keyboard.press('Escape')
    await expectVisible(page, [])
  })
})

test.describe('board setup', () => {
  test.beforeEach(async ({ page }) => {
    await gotoBoard(page)
  })

  test('creates, renames and deletes a tag', async ({ page, request }) => {
    const name = unique('setup tag')
    await page.getByRole('button', { name: 'Tags', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Manage tags' })
    await dialog.getByLabel('Name for new tag').fill(name)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog.getByLabel(`Name for ${name}`, { exact: true })).toBeVisible()
    const tagIcon = async (tagName: string) =>
      ((await (await request.get('/api/tags')).json()) as { name: string; icon: string }[]).find((t) => t.name === tagName)?.icon
    expect(await tagIcon(name)).toBe('tag')
    await pickIcon(page, dialog, `Icon for ${name}`, 'database', 'Database')
    await expect.poll(() => tagIcon(name)).toBe('database')

    const renamed = unique('renamed tag')
    await dialog.getByLabel(`Name for ${name}`, { exact: true }).fill(renamed)
    await dialog.getByLabel('Name for new tag').click()
    await expect.poll(async () => (await (await request.get('/api/tags')).json()).map((t: { name: string }) => t.name)).toContain(renamed)

    await dialog.getByLabel('Name for new tag').fill(renamed)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog.getByText('A tag with this name already exists')).toBeVisible()

    await dialog.getByRole('button', { name: `Delete tag ${renamed}` }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(dialog.getByLabel(`Name for ${renamed}`, { exact: true })).toBeHidden()

    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
  })

  test('creates a task type and a priority that become selectable in tasks', async ({ page, request }) => {
    const typeName = unique('Spike')
    await page.getByRole('button', { name: 'Type', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Manage task types' })
    await pickIcon(page, dialog, 'Icon for new task type', 'experiment', 'Experiment')
    await dialog.getByLabel('Name for new task type').fill(typeName)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog.getByLabel(`Name for ${typeName}`, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    const priorityName = unique('Blocker')
    await page.getByRole('button', { name: 'Priority', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Manage priorities' })
    await pickIcon(page, dialog, 'Icon for new priority', 'siren', 'Siren')
    await dialog.getByLabel('Name for new priority').fill(priorityName)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog.getByLabel(`Name for ${priorityName}`, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    const task = await createTask(request, { title: unique('Uses new catalogs') })
    await page.reload()
    await card(page, task.title).click()
    const taskDialog = page.getByRole('dialog', { name: 'Task details' })
    await taskDialog.getByRole('button', { name: /^Type / }).click()
    await page.getByRole('option', { name: new RegExp(typeName) }).click()
    await taskDialog.getByRole('button', { name: /^Priority / }).click()
    await page.getByRole('option', { name: new RegExp(priorityName) }).click()
    await saveTask(page)

    const saved = await getTask(request, task.id)
    expect([saved.type?.name, saved.priority.name]).toEqual([typeName, priorityName])
    const types: { name: string; icon: string; color: string }[] = await (await request.get('/api/task-types')).json()
    expect(types.find((t) => t.name === typeName)).toMatchObject({ icon: 'test-tube', color: '#a855f7' })
    const priorities: { name: string; icon: string; color: string }[] = await (await request.get('/api/priorities')).json()
    expect(priorities.find((p) => p.name === priorityName)).toMatchObject({ icon: 'siren', color: '#ef4444' })
  })

  test('creates a tag with a custom color from the full color picker', async ({ page, request }) => {
    const name = unique('custom color tag')
    await page.getByRole('button', { name: 'Tags', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Manage tags' })
    await dialog.getByLabel('Name for new tag').fill(name)
    await dialog.getByRole('button', { name: 'Custom color' }).last().click()
    const picker = page.getByRole('dialog', { name: 'Custom color' })
    await picker.getByLabel('Hex color code').fill('#0f766e')
    await picker.getByRole('button', { name: 'Apply' }).click()
    await expect(picker).toBeHidden()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()

    await expect
      .poll(async () => ((await (await request.get('/api/tags')).json()) as { name: string; color: string }[]).find((t) => t.name === name)?.color)
      .toBe('#0f766e')
    await expect(dialog.getByRole('listitem').filter({ hasText: name }).getByRole('button', { name: 'Custom color #0f766e' })).toBeVisible()
  })

  test('default types cannot be deleted but can be hidden from pickers', async ({ page }) => {
    await page.getByRole('button', { name: 'Type', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Manage task types' })
    await expect(dialog.getByRole('button', { name: 'Delete task type Bug' })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Hide Research' }).click()
    await expect(dialog.getByRole('button', { name: 'Show Research' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Show Research' }).click()
  })

  test('manages reporters', async ({ page, request }) => {
    const name = unique('Managed reporter')
    await page.getByRole('button', { name: 'Reporters', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Manage reporters' })
    await dialog.getByPlaceholder('New reporter name').fill(name)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog.getByRole('button', { name: `Rename reporter ${name}`, exact: true })).toBeVisible()
    await expect
      .poll(async () => (await (await request.get('/api/reporters')).json()).map((r: { name: string }) => r.name))
      .toContain(name)

    const renamed = `${name} renamed`
    await dialog.getByRole('button', { name: `Rename reporter ${name}`, exact: true }).click()
    await dialog.getByLabel(`New name for ${name}`, { exact: true }).fill(renamed)
    await dialog.getByLabel(`New name for ${name}`, { exact: true }).press('Enter')
    await expect(dialog.getByRole('button', { name: `Rename reporter ${renamed}`, exact: true })).toBeVisible()

    await dialog.getByRole('button', { name: `Delete reporter ${renamed}`, exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(dialog.getByRole('button', { name: `Rename reporter ${renamed}`, exact: true })).toHaveCount(0)
    await expect
      .poll(async () => (await (await request.get('/api/reporters')).json()).map((r: { name: string }) => r.name))
      .not.toContain(renamed)
  })

  test('adds, hides and deletes a custom column', async ({ page }) => {
    const name = unique('Review')
    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Manage columns' })
    await dialog.getByPlaceholder('Column name').fill(name)
    await expect(dialog.getByRole('button', { name: 'Icon for new column: Review' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(column(page, name)).toBeVisible()
    await expect(dialog.getByRole('button', { name: `Icon for ${name}: Review` })).toBeVisible()

    await dialog.getByRole('button', { name: `Hide ${name} from the board` }).click()
    await expect(column(page, name)).toBeHidden()
    await dialog.getByRole('button', { name: `Show ${name} on the board` }).click()
    await expect(column(page, name)).toBeVisible()

    await dialog.getByRole('button', { name: `Delete column ${name}` }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(column(page, name)).toBeHidden()
    await expect(dialog.getByRole('button', { name: 'Delete column New' })).toHaveCount(0)
  })
})
