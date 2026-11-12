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
  sectionKey?: string
  parentBoardId?: string
  parentEntityId?: string
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

export const RELATION_TYPES = [
  'part_of',
  'manages',
  'develops',
  'collaborates_with',
  'participates_in',
  'inspired_by',
  'depends_on',
  'related_to',
] as const

export type RelationType = (typeof RELATION_TYPES)[number]

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  part_of: 'Является частью',
  manages: 'Управляет',
  develops: 'Развивает',
  collaborates_with: 'Сотрудничает с',
  participates_in: 'Участвует в',
  inspired_by: 'Вдохновлено',
  depends_on: 'Зависит от',
  related_to: 'Связано с',
}
