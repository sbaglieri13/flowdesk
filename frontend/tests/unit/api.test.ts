import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../src/api/client'
import { statsApi } from '../../src/api/stats'
import { tasksApi } from '../../src/api/tasks'

const fetchMock = vi.fn()

function respond(status: number, body?: unknown, statusText = 'Error') {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: body === undefined ? () => Promise.reject(new Error('no body')) : () => Promise.resolve(body),
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('api client', () => {
  it('sends JSON with the right method and parses the response', async () => {
    respond(200, { id: 1 })
    await expect(api.post('/things', { name: 'x' })).resolves.toEqual({ id: 1 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/things')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"x"}')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('returns undefined for 204 responses', async () => {
    respond(204)
    await expect(api.delete('/things/1')).resolves.toBeUndefined()
  })

  it('does not force a JSON content type on uploads', async () => {
    respond(201, { id: 9 })
    const form = new FormData()
    form.append('file', new Blob(['x']), 'x.txt')
    await api.upload('/files', form)

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBe(form)
    expect(init.headers).toBeUndefined()
  })

  it.each([
    [{ detail: 'Task not found' }, 'Task not found'],
    [{ detail: [{ msg: 'too short' }, { msg: 'bad value' }] }, 'too short; bad value'],
    [{ detail: [{ nope: true }] }, 'Unprocessable'],
    [{ other: 'x' }, 'Unprocessable'],
    [undefined, 'Unprocessable'],
  ])('turns error body %j into a readable ApiError', async (body, message) => {
    respond(422, body, 'Unprocessable')
    const error = await api.get('/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, message })
  })
})

describe('tasksApi.list query string', () => {
  it('repeats multi-value filters and omits empty ones', async () => {
    respond(200, [])
    await tasksApi.list({
      search: 'login bug',
      priority_id: [1, 2],
      tag_id: [-1],
      type_id: [3],
      reporter_id: [-1, 4],
    })
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/tasks')
    expect(url.searchParams.getAll('priority_id')).toEqual(['1', '2'])
    expect(url.searchParams.getAll('tag_id')).toEqual(['-1'])
    expect(url.searchParams.getAll('type_id')).toEqual(['3'])
    expect(url.searchParams.getAll('reporter_id')).toEqual(['-1', '4'])
    expect(url.searchParams.get('search')).toBe('login bug')
  })

  it('has no query string without filters', async () => {
    respond(200, [])
    await tasksApi.list()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/tasks')
  })
})

describe('statsApi.overview', () => {
  it('passes only the provided range parameters', async () => {
    respond(200, {})
    await statsApi.overview({ since: '2026-01-01', bucket: 'month' })
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('since')).toBe('2026-01-01')
    expect(url.searchParams.get('bucket')).toBe('month')
    expect(url.searchParams.has('until')).toBe(false)
  })
})
