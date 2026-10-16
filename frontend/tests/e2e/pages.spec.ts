import { expect, test } from '@playwright/test'
import { column, createTask, gotoBoard, unique } from './helpers'

test.describe('statistics', () => {
  test('shows KPIs and changes period and grouping', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Stats closed') }, 'Done')
    await request.post(`/api/tasks/${task.id}/time-entries`, { data: { hours: 2.5 } })

    await gotoBoard(page)
    await page.getByRole('button', { name: 'Statistics' }).click()
    await expect(page.getByRole('heading', { name: 'Productivity statistics' })).toBeVisible()
    for (const label of ['Open tasks', 'Closed', 'Hours logged', 'Tasks closed', 'By type', 'By priority', 'By reporter']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }

    const overview = page.waitForRequest((r) => r.url().includes('/api/stats/overview') && r.url().includes('bucket=month'))
    await page.getByRole('button', { name: /by week/i }).click()
    await page.getByRole('option', { name: 'By month' }).click()
    await overview

    const always = page.waitForRequest((r) => r.url().includes('/api/stats/overview') && !r.url().includes('since='))
    await page.getByRole('button', { name: /last 90 days/i }).click()
    await page.getByRole('option', { name: 'Always' }).click()
    await always

    await page.getByRole('button', { name: /always/i }).click()
    await page.getByRole('option', { name: 'Custom range…' }).click()
    await expect(page.getByRole('button', { name: /,/ }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Back to board' }).click()
    await expect(column(page, 'New')).toBeVisible()
  })
})

test.describe('settings', () => {
  test('saves the external reference base URL', async ({ page, request }) => {
    await gotoBoard(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    const input = page.getByPlaceholder('https://your-domain.atlassian.net/browse')
    await input.fill('https://tracker.example.com/browse')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect
      .poll(async () => (await (await request.get('/api/settings')).json()).external_reference_base_url)
      .toBe('https://tracker.example.com/browse')
    await page.reload()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByPlaceholder('https://your-domain.atlassian.net/browse')).toHaveValue(
      'https://tracker.example.com/browse',
    )
    await request.put('/api/settings', { data: { external_reference_base_url: '' } })
  })

  test('exports a backup and restores it, bringing deleted data back', async ({ page, request }) => {
    const keep = await createTask(request, { title: unique('Survives restore') })
    await gotoBoard(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Export backup now' }).click()
    const download = page.getByRole('link', { name: 'Download' }).first()
    await expect(download).toBeVisible()
    expect((await request.get((await download.getAttribute('href'))!)).ok()).toBeTruthy()

    await request.delete(`/api/tasks/${keep.id}`)
    await page.getByRole('button', { name: 'Restore' }).first().click()
    await page.getByRole('alertdialog').getByRole('button', { name: /restore/i }).click()
    await expect(page.getByText(/backup restored/i)).toBeVisible()

    expect((await request.get(`/api/tasks/${keep.id}`)).ok()).toBeTruthy()
  })
})

test.describe('theme', () => {
  test('defaults to light even when the OS prefers dark, and remembers the choice', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    await gotoBoard(page)
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Toggle dark mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Toggle dark mode' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await context.close()
  })
})

test('the app has no console errors while navigating every page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('response', (r) => r.status() >= 500 && errors.push(`${r.status()} ${r.url()}`))

  await gotoBoard(page)
  await page.getByRole('button', { name: 'Statistics' }).click()
  await expect(page.getByRole('heading', { name: 'Productivity statistics' })).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('button', { name: 'Export backup now' })).toBeVisible()
  await page.getByRole('button', { name: 'Go to board' }).click()
  await expect(column(page, 'New')).toBeVisible()

  expect(errors).toEqual([])
})
