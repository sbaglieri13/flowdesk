import { File, FileCode, FileImage, FileText, FileXls, FileZip, type Icon } from '../icons/phosphor'

const ICONS: [Icon, string[]][] = [
  [FileImage, ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp']],
  [FileText, ['pdf', 'doc', 'docx', 'txt', 'md', 'log', 'rtf', 'odt']],
  [FileXls, ['xls', 'xlsx', 'csv', 'ods']],
  [FileZip, ['zip', 'rar', '7z', 'tar', 'gz']],
  [FileCode, ['json', 'js', 'ts', 'py', 'sql', 'yaml', 'yml', 'xml', 'html', 'sh']],
]

export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 && dot < filename.length - 1 ? filename.slice(dot + 1).toLowerCase() : ''
}

export function fileTypeIcon(filename: string): Icon {
  const extension = fileExtension(filename)
  return ICONS.find(([, extensions]) => extensions.includes(extension))?.[0] ?? File
}
