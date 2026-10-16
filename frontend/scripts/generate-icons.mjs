import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(root, 'node_modules', '@phosphor-icons', 'core', 'assets', 'duotone')
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src', 'icons', 'catalog.json'), 'utf8'))
const IMPORT_RE = /import \{([^}]+)\} from '(?:@phosphor-icons\/react|(?:\.\.?\/)+(?:icons\/)?phosphor)'/g

const regularAssets = path.join(root, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular')

// Their duotone layer is only a background box, not part of the glyph, so they ship in the regular weight.
const WITHOUT_BACKDROP = new Set([
  'ArrowsDownUp',
  'ArrowsIn',
  'ArrowsOut',
  'Check',
  'DownloadSimple',
  'ListBullets',
  'ListChecks',
  'ListNumbers',
  'Minus',
  'Plus',
  'TextItalic',
  'UploadSimple',
  'X',
])

const toPascal = (kebab) => kebab.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
const FILES = new Map(
  fs.readdirSync(assets).map((file) => [toPascal(file.replace(/-duotone\.svg$/, '')), path.join(assets, file)]),
)
for (const name of WITHOUT_BACKDROP) {
  const kebab = path.basename(FILES.get(name) ?? '', '-duotone.svg')
  if (!kebab) throw new Error(`No Phosphor icon named ${name}`)
  FILES.set(name, path.join(regularAssets, `${kebab}.svg`))
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !full.endsWith(path.join('icons', 'phosphor.ts')) ? [full] : []
  })
}

const used = new Set(catalog.map((entry) => toPascal(entry.key)))
used.add('Circle')
for (const file of [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'tests'))]) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
    for (const spec of match[1].split(',')) {
      const name = spec.trim().split(/\s+as\s+/)[0]
      if (name && !name.startsWith('type ') && /^[A-Z]/.test(name) && name !== 'IconContext') used.add(name)
    }
  }
}

const names = [...used].sort()
const icons = names.map((name) => {
  const file = FILES.get(name)
  if (!file) throw new Error(`No Phosphor duotone icon named ${name}`)
  const inner = fs.readFileSync(file, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return `export const ${name} = icon(${JSON.stringify(inner)})`
})

const header = `import { createElement, type ReactElement, type SVGProps } from 'react'

export type Icon = (props: SVGProps<SVGSVGElement>) => ReactElement

const DEFAULTS = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 256 256',
  width: '1em',
  height: '1em',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
}

function icon(paths: string): Icon {
  return (props) => createElement('svg', { ...DEFAULTS, ...props, dangerouslySetInnerHTML: { __html: paths } })
}
`
fs.writeFileSync(path.join(root, 'src', 'icons', 'phosphor.ts'), `${header}\n${icons.join('\n')}\n`)

const registry = `import { ${catalog.map((entry) => toPascal(entry.key)).sort().join(', ')}, type Icon } from './phosphor'

export const ICON_COMPONENTS: Record<string, Icon> = {
${catalog.map((entry) => `  '${entry.key}': ${toPascal(entry.key)},`).join('\n')}
}
`
fs.writeFileSync(path.join(root, 'src', 'icons', 'registry.ts'), registry)
console.log(`Generated ${names.length} icons (${catalog.length} in the picker catalog).`)
