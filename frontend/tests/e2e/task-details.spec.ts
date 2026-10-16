import { expect, test } from '@playwright/test'
import { card, chooseOption, createTask, getTask, gotoBoard, openTask, saveTask, unique } from './helpers'

test.describe('task details', () => {
  test.beforeEach(async ({ page }) => {
    await gotoBoard(page)
  })

  test('formats description text as you type and keeps it after saving', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Rich text') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    const editor = dialog.getByLabel('Description', { exact: true }).last()

    await editor.click()
    await page.keyboard.type('Plain ')
    await page.keyboard.press('Control+b')
    await page.keyboard.type('bold')
    await page.keyboard.press('Control+b')
    await page.keyboard.type(' ')
    await dialog.getByRole('button', { name: 'Text color' }).click()
    await page.getByLabel('Set text color #ef4444').click()
    await page.keyboard.press('Control+b')
    await page.keyboard.type('red bold')
    await page.keyboard.press('Enter')
    await dialog.getByRole('button', { name: 'Text color' }).click()
    await page.getByLabel('Remove text color').click()
    await page.keyboard.press('Control+b')
    await page.keyboard.type('- first')
    await page.keyboard.press('Enter')
    await page.keyboard.type('second')

    await expect(editor.locator('strong').first()).toHaveText('bold')
    await expect(editor.locator('ul li')).toHaveCount(2)
    await expect(editor.getByText('- first')).toHaveCount(0)
    const redBold = editor.locator('strong', { hasText: 'red bold' })
    await expect(redBold).toHaveCSS('color', 'rgb(239, 68, 68)')

    await saveTask(page)
    const saved = await getTask(request, task.id)
    expect(saved.description).toContain('<strong>bold</strong>')
    expect(saved.description).toMatch(/color: (#ef4444|rgb\(239, 68, 68\))/)
    expect(saved.description).toContain('<ul>')
    expect(saved.description).not.toContain('**')

    const reopened = await openTask(page, task.title)
    await expect(reopened.getByLabel('Description', { exact: true }).last().locator('ul li')).toHaveCount(2)
    await expect(reopened.getByText('Unsaved changes')).toBeHidden()
  })

  test('applies a custom hex color from the picker', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Hex color') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await dialog.getByLabel('Description', { exact: true }).last().click()
    await dialog.getByRole('button', { name: 'Text color' }).click()
    await page.getByLabel('Hex color code').fill('#16a34a')
    await page.getByRole('button', { name: 'Apply' }).click()
    await page.keyboard.type('green')
    await saveTask(page)

    expect((await getTask(request, task.id)).description).toMatch(/color: (#16a34a|rgb\(22, 163, 74\))/)
  })

  test('opens a task with a description as the first task after loading the page', async ({ page, request }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const task = await createTask(request, { title: unique('First opened'), description: '<p>Existing <strong>text</strong></p>' })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await expect(dialog.getByLabel('Description', { exact: true }).last().locator('strong')).toHaveText('text')
    await expect(dialog.getByText('Unsaved changes')).toBeHidden()
    expect(errors).toEqual([])
  })

  test('keeps notes separate from the description', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Notes'), description: '<p>Desc</p>' })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await dialog.getByRole('button', { name: 'Notes' }).click()
    const notes = dialog.getByLabel('Notes', { exact: true }).last()
    await notes.click()
    await page.keyboard.type('Meeting outcome')
    await saveTask(page)

    const saved = await getTask(request, task.id)
    expect([saved.description, saved.notes]).toEqual(['<p>Desc</p>', '<p>Meeting outcome</p>'])
  })

  test('manages checklist items and shows progress on the card', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Checklist') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    const input = dialog.getByPlaceholder(/add checklist item/i)
    await input.fill('Step one')
    await input.press('Enter')
    await input.fill('Step two')
    await input.press('Enter')
    await dialog.getByRole('checkbox').first().check()
    await saveTask(page)

    const saved = await getTask(request, task.id)
    expect(saved.checklist_items.map((i) => [i.text, i.is_done])).toEqual([
      ['Step one', true],
      ['Step two', false],
    ])
    await expect(card(page, task.title)).toContainText('1/2')
  })

  test('logs time and shows the total on the card', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Hours') })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await dialog.getByLabel('Hours for new entry').fill('1.5')
    await dialog.getByLabel('Note for new entry').fill('Analysis')
    await dialog.getByLabel('Hours for new entry').press('Enter')
    await dialog.getByLabel('Hours for new entry').fill('2')
    await dialog.getByLabel('Hours for new entry').press('Enter')
    await saveTask(page)

    const saved = await getTask(request, task.id)
    expect(saved.total_hours).toBe(3.5)
    await expect(card(page, task.title)).toContainText('3.5h')
  })

  test('stores several documentation links and removes one', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Docs') })
    await page.reload()
    let dialog = await openTask(page, task.title)
    await dialog.getByLabel('Documentation link 1').fill('https://wiki.example.com/a')
    await dialog.getByRole('button', { name: 'Add link' }).click()
    await dialog.getByLabel('Documentation link 2').fill('notion.so/b')
    await expect(dialog.getByRole('link', { name: 'Open documentation link' }).nth(1)).toHaveAttribute(
      'href',
      'https://notion.so/b',
    )
    await saveTask(page)
    expect((await getTask(request, task.id)).doc_urls).toEqual(['https://wiki.example.com/a', 'notion.so/b'])

    dialog = await openTask(page, task.title)
    await dialog.getByRole('button', { name: 'Remove documentation link' }).first().click()
    await saveTask(page)
    expect((await getTask(request, task.id)).doc_urls).toEqual(['notion.so/b'])
  })

  test('uploads and removes an attachment', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Files') })
    await page.reload()
    let dialog = await openTask(page, task.title)
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(dialog.getByText('notes.txt')).toBeVisible()
    await expect(dialog.getByText('Pending upload')).toBeVisible()
    await saveTask(page)

    const saved = await getTask(request, task.id)
    expect(saved.attachments.map((a) => a.filename)).toEqual(['notes.txt'])
    const download = await request.get(`/api/tasks/${task.id}/attachments/${saved.attachments[0].id}/download`)
    expect(await download.text()).toBe('hello')

    dialog = await openTask(page, task.title)
    const link = dialog.getByRole('link', { name: 'Download notes.txt' })
    await expect(link).toContainText('Download')
    const [file] = await Promise.all([page.waitForEvent('download'), link.click()])
    expect(file.suggestedFilename()).toBe('notes.txt')
    await dialog.getByRole('button', { name: 'Remove attachment notes.txt' }).click()
    await saveTask(page)
    expect((await getTask(request, task.id)).attachments).toEqual([])
  })

  test('adds a reporter inline and assigns it', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Reporter') })
    const reporter = unique('Reporter person')
    await page.reload()
    const dialog = await openTask(page, task.title)
    await dialog.getByRole('button', { name: 'Add a new reporter' }).click()
    await dialog.getByPlaceholder('New reporter name').fill(reporter)
    await dialog.getByPlaceholder('New reporter name').press('Enter')
    await expect(dialog.getByRole('button', { name: new RegExp(`^Reporter ${reporter}`) })).toBeVisible()
    await saveTask(page)

    expect((await getTask(request, task.id)).reporter?.name).toBe(reporter)
    await chooseOption(await openTask(page, task.title), 'Reporter', /^Unassigned$/)
    await saveTask(page)
    expect((await getTask(request, task.id)).reporter).toBeNull()
  })

  test('creates and toggles tags from the task', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Tagged') })
    const tag = unique('tag')
    await page.reload()
    const dialog = await openTask(page, task.title)
    await dialog.getByRole('button', { name: /new tag/i }).click()
    await dialog.getByPlaceholder('Tag name').fill(tag)
    await dialog.getByPlaceholder('Tag name').press('Enter')
    const chip = dialog.getByRole('button', { name: new RegExp(tag) })
    await expect(chip).toBeVisible()
    if (!(await chip.getAttribute('aria-pressed'))?.includes('true')) await chip.click()
    await saveTask(page)

    expect((await getTask(request, task.id)).tags.map((t) => t.name)).toEqual([tag])
    await expect(card(page, task.title)).toContainText(tag)
  })

  test('links the external reference when a base URL is configured', async ({ page, request }) => {
    await request.put('/api/settings', { data: { external_reference_base_url: 'https://jira.example.com/browse/' } })
    const task = await createTask(request, { title: unique('Jira'), external_reference: 'PROJ-7' })
    await page.reload()
    const dialog = await openTask(page, task.title)
    await expect(dialog.getByRole('link', { name: 'Open external reference' })).toHaveAttribute(
      'href',
      'https://jira.example.com/browse/PROJ-7',
    )
    await expect(dialog.getByText('https://jira.example.com/browse/PROJ-7')).toHaveCount(0)
    await request.put('/api/settings', { data: { external_reference_base_url: '' } })
  })
})

test.describe('attachment preview', () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJgYGBAQAQGgEBpnz9wwAAAABJRU5ErkJggg==',
    'base64',
  )
  const PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  )

  test('previews images, PDFs and text, while other files are download-only', async ({ page, request }) => {
    const task = await createTask(request, { title: unique('Preview') })
    const files: [string, string, Buffer][] = [
      ['diagram.png', 'image/png', PNG],
      ['spec.pdf', 'application/pdf', PDF],
      ['notes.txt', 'text/plain', Buffer.from('<script>window.pwned = true</script>\nplain text line')],
      ['report.docx', 'application/octet-stream', Buffer.from('docx')],
    ]
    for (const [name, mimeType, buffer] of files) {
      await request.post(`/api/tasks/${task.id}/attachments`, { multipart: { file: { name, mimeType, buffer } } })
    }
    await gotoBoard(page)
    const dialog = await openTask(page, task.title)

    await dialog.getByRole('button', { name: 'Preview diagram.png' }).click()
    let preview = page.getByRole('dialog', { name: 'Preview of diagram.png' })
    const image = preview.getByRole('img', { name: 'diagram.png' })
    await expect(image).toBeVisible()
    expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2)
    await page.keyboard.press('Escape')
    await expect(preview).toBeHidden()
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Preview spec.pdf' }).click()
    preview = page.getByRole('dialog', { name: 'Preview of spec.pdf' })
    await expect(preview.locator('iframe')).toHaveAttribute('src', /\/preview$/)
    await preview.getByRole('button', { name: 'Close preview' }).click()

    await dialog.getByRole('button', { name: 'Preview notes.txt' }).click()
    preview = page.getByRole('dialog', { name: 'Preview of notes.txt' })
    await expect(preview.getByText('plain text line')).toBeVisible()
    await expect(preview.getByText('<script>window.pwned = true</script>')).toBeVisible()
    expect(await page.evaluate(() => (window as { pwned?: boolean }).pwned)).toBeUndefined()
    const [download] = await Promise.all([page.waitForEvent('download'), preview.getByRole('link', { name: /download/i }).click()])
    expect(download.suggestedFilename()).toBe('notes.txt')
    await page.mouse.click(5, 5)
    await expect(preview).toBeHidden()
    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole('button', { name: 'Preview report.docx' })).toHaveCount(0)
    await expect(dialog.getByRole('link', { name: 'Download report.docx' })).toBeVisible()
  })
})
