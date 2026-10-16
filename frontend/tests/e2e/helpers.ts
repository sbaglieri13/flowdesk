import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

export interface ApiTask {
  id: number
  display_code: string
  title: string
  description: string | null
  notes: string | null
  column_id: number
  priority: { id: number; name: string }
  type: { id: number; name: string } | null
  reporter: { id: number; name: string } | null
  doc_urls: string[]
  checklist_items: { id: number; text: string; is_done: boolean }[]
  time_entries: { id: number; hours: number; note: string | null }[]
  attachments: { id: number; filename: string }[]
  tags: { id: number; name: string }[]
  closed_at: string | null
  total_hours: number
}

let counter = 0
export function unique(prefix: string): string {
  counter += 1
  return `${prefix} ${Date.now().toString(36)}${counter}`
}

export async function columnId(request: APIRequestContext, name: string): Promise<number> {
  const columns: { id: number; name: string }[] = await (await request.get('/api/columns')).json()
  const column = columns.find((c) => c.name === name)
  if (!column) throw new Error(`Column ${name} not found`)
  return column.id
}

export async function createTask(
  request: APIRequestContext,
  fields: Record<string, unknown> & { title: string },
  column = 'New',
): Promise<ApiTask> {
  const response = await request.post('/api/tasks', { data: { column_id: await columnId(request, column), ...fields } })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

export async function getTask(request: APIRequestContext, id: number): Promise<ApiTask> {
  return (await request.get(`/api/tasks/${id}`)).json()
}

export function column(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true })
}

export function card(page: Page, title: string): Locator {
  return page.getByRole('button', { name: new RegExp(escapeRegExp(title)) })
}

export function taskWindow(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Task details' })
}

export async function gotoBoard(page: Page): Promise<void> {
  await page.goto('/')
  await expect(column(page, 'New')).toBeVisible()
}

export async function openTask(page: Page, title: string): Promise<Locator> {
  await card(page, title).click()
  const dialog = taskWindow(page)
  await expect(dialog).toBeVisible()
  return dialog
}

export async function saveTask(page: Page): Promise<void> {
  await taskWindow(page).getByRole('button', { name: 'Save' }).click()
  await expect(taskWindow(page)).toBeHidden()
}

export async function chooseOption(scope: Locator, field: string, option: RegExp): Promise<void> {
  await scope.getByRole('button', { name: new RegExp(`^${field} `) }).click()
  await scope.page().getByRole('option', { name: option }).click()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
