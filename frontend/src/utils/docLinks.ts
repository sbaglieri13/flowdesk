export function cleanDocUrls(urls: string[]): string[] {
  return urls.map((url) => url.trim()).filter(Boolean)
}

export function sameDocUrls(a: string[], b: string[]): boolean {
  const left = cleanDocUrls(a)
  const right = cleanDocUrls(b)
  return left.length === right.length && left.every((url, i) => url === right[i])
}

export function docUrlHref(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
  return `https://${trimmed}`
}
