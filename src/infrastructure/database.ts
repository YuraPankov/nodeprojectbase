import Dexie, { type Table } from 'dexie'
import type { Board, BoardNode, Entity, Relation } from '../domain/models'

export class NodebaseDatabase extends Dexie {
  entities!: Table<Entity, string>
  relations!: Table<Relation, string>
  boards!: Table<Board, string>
  boardNodes!: Table<BoardNode, string>

  constructor() {
    super('nodebase')

    this.version(1).stores({
      entities: 'id, type, title, updatedAt, archivedAt',
      relations: 'id, fromEntityId, toEntityId, type',
      boards: 'id, title, updatedAt',
      boardNodes: 'id, boardId, entityId, [boardId+entityId]',
    })
  }
}

export const db = new NodebaseDatabase()

export async function ensureDefaultBoard(): Promise<void> {
  await db.transaction('rw', db.boards, async () => {
    const count = await db.boards.count()
    if (count > 0) return

    const now = new Date().toISOString()
    await db.boards.add({
      id: crypto.randomUUID(),
      title: 'Моя база',
      description: 'Основное пространство Nodebase',
      createdAt: now,
      updatedAt: now,
    })
  })
}