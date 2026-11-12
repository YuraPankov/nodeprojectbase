export const ENTITY_TYPES = [
  'person',
  'project',
  'artist',
  'organization',
  'idea',
  'knowledge',
  'resource',
  'task',
  'event',
  'note',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: 'Человек',
  project: 'Проект',
  artist: 'Артист',
  organization: 'Организация',
  idea: 'Идея',
  knowledge: 'Знание',
  resource: 'Ресурс',
  task: 'Задача',
  event: 'Событие',
  note: 'Заметка',
}

export interface Entity {
  id: string
  type: EntityType
  title: string
  description: string
  status?: string
  properties: Record<string, unknown>
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface Relation {
  id: string
  fromEntityId: string
  toEntityId: string
  type: string
  label?: string
  properties: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Board {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface BoardNode {
  id: string
  boardId: string
  entityId: string
  positionX: number
  positionY: number
  width?: number
  height?: number
  displayConfig: Record<string, unknown>
}