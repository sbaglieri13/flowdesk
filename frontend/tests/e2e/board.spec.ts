import { expect, test } from '@playwright/test'
import {
  card,
  chooseOption,
  column,
  columnId,
  createTask,
  getTask,
  gotoBoard,
  openTask,
  saveTask,
  taskWindow,
  unique,
} from './helpers'

test.describe('board', () => {
  test.beforeEach(async ({ page }) => {
    await gotoBoard(page)
  })

  test('shows the default columns and starts in the light theme', async ({ page }) => {
    for (const name of ['New', 'Analysis', 'In Progress', 'Testing', 'Done']) {
      await expect(column(page, name)).toBeVisible()
    }
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('creates a task from a column', async ({ page, request }) => {
    const title = unique('Created from UI')
    await column(page, 'Analysis').getByRole('button', { name: 'Add task' }).click()
    const dialog = page.getByRole('dialog', { name: 'New task' })
    await dialog.getByPlaceholder('What needs to be done?').fill(title)
    await dialog.getByRole('button', { name: 'Create task' }).click()

    await expect(dialog).toBeHidden()
    await expect(card(page, title)).toBeVisible()
    await expect(column(page, 'Analysis').getByText(title)).toBeVisible()

    const [task] = await (await request.get('/api/tasks', { params: { search: title } })).json()
    expect(task.priority.name).toBe('Medium')
    expect(task.type).toBeNull()
  })

  test('cannot create a task without a title', async ({ page }) => {
    await column(page, 'New').getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByRole('dialog', { name: 'New task' }).getByRole('button', { name: 'Create task' })).toBeDisabled()
  })

  test('edits fields and saves only on Save', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Edit me') })
    await page.reload()
    const dialog = await openTask(page, task.title)

    const newTitle = unique('Renamed')
    await dialog.locator('#task-modal-title').fill(newTitle)
    await chooseOption(dialog, 'Priority', /Urgent/)
    await chooseOption(dialog, 'Type', /Bug/)
    await dialog.getByPlaceholder('e.g. PROJ-123').fill('PROJ-42')

    expect((await getTask(request, task.id)).title).toBe(task.title)
    await expect(dialog.getByText('Unsaved changes')).toBeVisible()
    await saveTask(page)

    const saved = await getTask(request, task.id)
    expect([saved.title, saved.priority.name, saved.type?.name]).toEqual([newTitle, 'Urgent', 'Bug'])
    await expect(card(page, newTitle)).toBeVisible()
  })

  test('asks before discarding unsaved changes', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Discard') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await expect(dialog.getByText('Unsaved changes')).toBeHidden()

    await dialog.locator('#task-modal-title').fill('Changed but not saved')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
    await confirm.getByRole('button', { name: 'Keep editing' }).click()
    await expect(dialog.locator('#task-modal-title')).toHaveValue('Changed but not saved')

    await page.keyboard.press('Escape')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard changes' }).click()
    await expect(taskWindow(page)).toBeHidden()
    expect((await getTask(request, task.id)).title).toBe(task.title)
  })

  test('closes without asking when nothing changed', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Untouched') })
    await page.reload()
    await openTask(page, task.title)
    await page.keyboard.press('Escape')
    await expect(taskWindow(page)).toBeHidden()
    await expect(page.getByRole('alertdialog')).toBeHidden()
  })

  test('moves a task with the Status field and closes it in Done', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Status move') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await chooseOption(dialog, 'Status', /Done/)
    await saveTask(page)

    await expect(column(page, 'Done').getByText(task.title)).toBeVisible()
    const saved = await getTask(request, task.id)
    expect(saved.column_id).toBe(await columnId(request, 'Done'))
    expect(saved.closed_at).not.toBeNull()
  })

  test('moves a task by drag and drop', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Dragged') })
    await request.post(`/api/tasks/${task.id}/move`, { data: { column_id: task.column_id, position: -1 } })
    await page.reload()
    const source = card(page, task.title)
    const target = column(page, 'Testing')
    await source.hover()
    const from = (await source.boundingBox())!
    const to = (await target.boundingBox())!

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 })
    await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 20 })
    await page.mouse.up()

    await expect(target.getByText(task.title)).toBeVisible()
    await expect.poll(async () => (await getTask(request, task.id)).column_id).toBe(await columnId(request, 'Testing'))
  })

  test('reorders cards inside a column by drag and drop', async ({ page, request }) => {
    const first = await createTask(request, { title: unique('Reorder first') }, 'Testing')
    const second = await createTask(request, { title: unique('Reorder second') }, 'Testing')
    await page.reload()
    const testing = column(page, 'Testing')
    const firstCard = card(page, first.title)
    const secondCard = card(page, second.title)
    await secondCard.hover()
    const from = (await secondCard.boundingBox())!
    const to = (await firstCard.boundingBox())!

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, { steps: 5 })
    await page.mouse.move(to.x + to.width / 2, to.y + 5, { steps: 20 })
    await page.mouse.up()

    const titles = async () =>
      (await testing.getByRole('button', { name: /Reorder (first|second)/ }).allTextContents()).map((t) =>
        t.includes(second.title) ? 'second' : 'first',
      )
    await expect.poll(titles).toEqual(['second', 'first'])
    await page.waitForTimeout(500)
    expect(await titles()).toEqual(['second', 'first'])
    await page.reload()
    await expect.poll(titles).toEqual(['second', 'first'])
  })

  test('opens a card with the keyboard', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Keyboard') })
    await page.reload()
    await card(page, task.title).focus()
    await page.keyboard.press('Enter')
    await expect(taskWindow(page)).toBeVisible()
  })

  test('auto-sorts a column by priority', async ({ page, request }) => {
    const low = await createTask(request, { title: unique('Sort low'), priority_id: await priorityId(request, 'Low') }, 'On Hold')
    const urgent = await createTask(
      request,
      { title: unique('Sort urgent'), priority_id: await priorityId(request, 'Urgent') },
      'On Hold',
    )
    await page.reload()
    const onHold = column(page, 'On Hold')
    await onHold.getByRole('button', { name: 'Auto-sort column' }).click()
    await page.getByRole('menuitem', { name: /Highest first/ }).click()

    await expect
      .poll(async () => {
        const tasks: { title: string }[] = await (
          await request.get('/api/tasks', { params: { column_id: await columnId(request, 'On Hold') } })
        ).json()
        return tasks.map((t) => t.title).filter((title) => title === urgent.title || title === low.title)
      })
      .toEqual([urgent.title, low.title])
  })

  test('deletes a task after confirmation', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Delete me') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await dialog.getByRole('button', { name: 'Delete task' }).click()
    await page.getByRole('alertdialog', { name: 'Delete this task?' }).getByRole('button', { name: 'Delete' }).click()

    await expect(card(page, task.title)).toBeHidden()
    expect((await request.get(`/api/tasks/${task.id}`)).status()).toBe(404)
  })
})

async function priorityId(request: import('@playwright/test').APIRequestContext, name: string): Promise<number> {
  const priorities: { id: number; name: string }[] = await (await request.get('/api/priorities')).json()
  return priorities.find((p) => p.name === name)!.id
}
