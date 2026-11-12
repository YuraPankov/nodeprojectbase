import { db } from '../infrastructure/database'
import type { Relation, RelationType } from '../domain/models'

export async function createRelation(input: {
  fromEntityId: string
  toEntityId: string
  type: RelationType
}): Promise<Relation> {
  if (!input.fromEntityId || !input.toEntityId) throw new Error('Выберите оба объекта')
  if (input.fromEntityId === input.toEntityId) throw new Error('Нельзя связать объект с самим собой')

  const [from, to] = await Promise.all([
    db.entities.get(input.fromEntityId),
    db.entities.get(input.toEntityId),
  ])
  if (!from || from.archivedAt !== null || !to || to.archivedAt !== null) {
    throw new Error('Один из объектов не найден или находится в архиве')
  }

  const existing = await db.relations.toArray()
  if (existing.some((relation) =>
    relation.fromEntityId === input.fromEntityId &&
    relation.toEntityId === input.toEntityId &&
    relation.type === input.type
  )) throw new Error('Такая связь уже существует')

  const now = new Date().toISOString()
  const relation: Relation = {
    id: crypto.randomUUID(),
    fromEntityId: input.fromEntityId,
    toEntityId: input.toEntityId,
    type: input.type,
    properties: {},
    createdAt: now,
    updatedAt: now,
  }
  await db.relations.add(relation)
  return relation
}

export async function listRelations(): Promise<Relation[]> {
  const relations = await db.relations.toArray()
  return relations.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteRelation(id: string): Promise<void> {
  await db.relations.delete(id)
}
