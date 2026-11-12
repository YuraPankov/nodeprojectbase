import { db } from './database'

export interface NodebaseBackup {
  format: 'NODEBASE_BACKUP'
  version: 1
  exportedAt: string
  data: { entities: unknown[]; relations: unknown[]; boards: unknown[]; boardNodes: unknown[] }
}

export async function exportBackup(): Promise<void> {
  const backup: NodebaseBackup = {
    format: 'NODEBASE_BACKUP',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      entities: await db.entities.toArray(),
      relations: await db.relations.toArray(),
      boards: await db.boards.toArray(),
      boardNodes: await db.boardNodes.toArray(),
    },
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nodebase-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<void> {
  let parsed: unknown
  try { parsed = JSON.parse(await file.text()) } catch { throw new Error('Файл не является корректным JSON') }
  if (!parsed || typeof parsed !== 'object') throw new Error('Некорректный файл резервной копии')
  const backup = parsed as Partial<NodebaseBackup>
  if (backup.format !== 'NODEBASE_BACKUP' || backup.version !== 1 || !backup.data) throw new Error('Неизвестный формат или версия резервной копии')
  const { entities, relations, boards, boardNodes } = backup.data as NodebaseBackup['data']
  if (![entities, relations, boards, boardNodes].every(Array.isArray)) throw new Error('В резервной копии отсутствуют необходимые разделы данных')
  const hasKeys = (items: unknown[], keys: string[]) => items.every(item => !!item && typeof item === 'object' && keys.every(key => key in item))
  if (!hasKeys(entities, ['id','type','title','createdAt','updatedAt','archivedAt']) ||
      !hasKeys(relations, ['id','fromEntityId','toEntityId','type']) ||
      !hasKeys(boards, ['id','title','createdAt','updatedAt']) ||
      !hasKeys(boardNodes, ['id','boardId','entityId','positionX','positionY'])) {
    throw new Error('Структура резервной копии повреждена')
  }
  await db.transaction('rw', db.entities, db.relations, db.boards, db.boardNodes, async () => {
    await db.boardNodes.clear()
    await db.relations.clear()
    await db.entities.clear()
    await db.boards.clear()
    if (entities.length) await db.entities.bulkAdd(entities as never[])
    if (relations.length) await db.relations.bulkAdd(relations as never[])
    if (boards.length) await db.boards.bulkAdd(boards as never[])
    if (boardNodes.length) await db.boardNodes.bulkAdd(boardNodes as never[])
  })
}
