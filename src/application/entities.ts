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

export async function updateEntity(id: string, input: { title: string; type: EntityType; description?: string }): Promise<Entity> {
  const entity = await db.entities.get(id)
  if (!entity || entity.archivedAt !== null) throw new Error('Объект не найден или находится в архиве')
  const title = input.title.trim()
  if (!title) throw new Error('Название не может быть пустым')
  const updated: Entity = { ...entity, title, type: input.type, description: input.description?.trim() ?? '', updatedAt: new Date().toISOString() }
  await db.entities.put(updated)
  return updated
}

export async function listArchivedEntities(): Promise<Entity[]> {
  const entities = await db.entities.toArray()
  return entities.filter((entity) => entity.archivedAt !== null).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))
}

export async function restoreEntity(id: string): Promise<void> {
  const entity = await db.entities.get(id)
  if (!entity || entity.archivedAt === null) return
  await db.entities.update(id, { archivedAt: null, updatedAt: new Date().toISOString() })
}

export async function listActiveEntities(): Promise<Entity[]> {
  const entities = await db.entities.toArray()
  return entities
    .filter((entity) => entity.archivedAt === null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function archiveEntity(id: string): Promise<void> {
  const entity = await db.entities.get(id)
  if (!entity) return

  const now = new Date().toISOString()
  await db.transaction('rw', db.entities, async () => {
    await db.entities.update(id, {
      archivedAt: now,
      updatedAt: now,
    })
  })
}