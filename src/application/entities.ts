import { db } from '../infrastructure/database'
import type { Entity, EntityType } from '../domain/models'

export async function createEntity(input: {
  title: string
  type: EntityType
  description?: string
}): Promise<Entity> {
  const title = input.title.trim()
  if (!title) throw new Error('Название не может быть пустым')

  const now = new Date().toISOString()
  const entity: Entity = {
    id: crypto.randomUUID(),
    type: input.type,
    title,
    description: input.description?.trim() ?? '',
    properties: {},
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }

  await db.entities.add(entity)
  return entity
}

export async function listActiveEntities(): Promise<Entity[]> {
  return db.entities
    .filter((entity) => entity.archivedAt === null)
    .reverse()
    .sortBy('updatedAt')
}

export async function archiveEntity(id: string): Promise<void> {
  const entity = await db.entities.get(id)
  if (!entity) return

  await db.entities.update(id, {
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}