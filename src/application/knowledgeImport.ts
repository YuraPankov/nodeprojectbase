import { db } from '../infrastructure/database'
import type { Entity, Relation } from '../domain/models'

type KnowledgePack = {
  format: 'nodebase-knowledge-pack'
  schemaVersion: number
  entities: Entity[]
  relations: Relation[]
}

export async function importKnowledgePack(input: unknown): Promise<{ createdEntities: number; reusedEntities: number; createdRelations: number; reusedRelations: number; placements: number }> {
  const pack = input as KnowledgePack
  if (!pack || pack.format !== 'nodebase-knowledge-pack' || pack.schemaVersion !== 1 || !Array.isArray(pack.entities) || !Array.isArray(pack.relations)) {
    throw new Error('Файл не является совместимым пакетом знаний Nodebase')
  }
  for (const entity of pack.entities) {
    if (!entity.id || !entity.title?.trim() || !entity.type || !Array.isArray(entity.properties?.sections)) {
      throw new Error('В пакете обнаружена сущность с некорректными полями')
    }
  }
  const result = { createdEntities: 0, reusedEntities: 0, createdRelations: 0, reusedRelations: 0, placements: 0 }
  const idMap = new Map<string, string>()
  await db.transaction('rw', db.entities, db.relations, db.boards, db.boardNodes, async () => {
    const existingEntities = await db.entities.toArray()
    const existingRelations = await db.relations.toArray()
    const boards = await db.boards.toArray()
    for (const source of pack.entities) {
      const match = existingEntities.find(item => item.type === source.type && item.title.trim().toLocaleLowerCase('ru-RU') === source.title.trim().toLocaleLowerCase('ru-RU'))
      if (match) {
        idMap.set(source.id, match.id)
        result.reusedEntities++
        continue
      }
      const idCollision = await db.entities.get(source.id)
      const entity: Entity = { ...source, id: idCollision ? crypto.randomUUID() : source.id, properties: { ...source.properties } }
      await db.entities.add(entity)
      existingEntities.push(entity)
      idMap.set(source.id, entity.id)
      result.createdEntities++
    }
    for (const source of pack.relations) {
      const fromEntityId = idMap.get(source.fromEntityId)
      const toEntityId = idMap.get(source.toEntityId)
      if (!fromEntityId || !toEntityId || fromEntityId === toEntityId) continue
      const match = existingRelations.find(item => item.fromEntityId === fromEntityId && item.toEntityId === toEntityId && item.type === source.type)
      if (match) {
        result.reusedRelations++
        continue
      }
      const idCollision = await db.relations.get(source.id)
      const relation: Relation = { ...source, id: idCollision ? crypto.randomUUID() : source.id, fromEntityId, toEntityId }
      await db.relations.add(relation)
      existingRelations.push(relation)
      result.createdRelations++
    }
    for (const source of pack.entities) {
      const entityId = idMap.get(source.id)
      if (!entityId) continue
      const sectionKeys = source.properties.sections as string[]
      for (const sectionKey of sectionKeys) {
        const board = boards.find(item => item.sectionKey === sectionKey && !item.parentBoardId)
        if (!board) continue
        const exists = await db.boardNodes.where('[boardId+entityId]').equals([board.id, entityId]).first()
        if (exists) continue
        const count = await db.boardNodes.where('boardId').equals(board.id).count()
        await db.boardNodes.add({ id: crypto.randomUUID(), boardId: board.id, entityId, positionX: 80 + (count % 4) * 250, positionY: 80 + Math.floor(count / 4) * 160, displayConfig: {} })
        result.placements++
      }
    }
  })
  return result
}
