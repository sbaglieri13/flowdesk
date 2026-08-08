export interface Priority {
  id: number
  name: string
  emoji: string
  color: string
  position: number
  is_default: boolean
  is_hidden: boolean
}

export interface Tag {
  id: number
  name: string
  color: string
  emoji: string | null
}

export interface ChecklistItem {
  id: number
  text: string
  is_done: boolean
  position: number
}

export interface Attachment {
  id: number
  filename: string
  content_type: string | null
  size_bytes: number
  created_at: string
}

export interface BoardColumn {
  id: number
  name: string
  emoji: string | null
  position: number
  is_default: boolean
  is_hidden: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  display_code: string
  title: string
  description: string | null
  notes: string | null
  column_id: number
  position: number
  priority: Priority
  deadline: string | null
  external_reference: string | null
  external_reference_url: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  checklist_items: ChecklistItem[]
  attachments: Attachment[]
}

export interface Settings {
  external_reference_base_url: string
}

export interface BackupInfo {
  filename: string
  size_bytes: number
  created_at: string
}
