import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createEntity, listActiveEntities, archiveEntity } from '../application/entities'
import { createRelation, deleteRelation, listRelations } from '../application/relations'
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, RELATION_TYPES, RELATION_TYPE_LABELS, type Entity, type EntityType, type Relation, type RelationType } from '../domain/models'
import { ensureDefaultBoard } from '../infrastructure/database'
import './app.css'

export default function App() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EntityType>('project')
  const [description, setDescription] = useState('')
  const [fromEntityId, setFromEntityId] = useState('')
  const [toEntityId, setToEntityId] = useState('')
  const [relationType, setRelationType] = useState<RelationType>('related_to')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [relationError, setRelationError] = useState('')
  const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities])

  async function refresh() {
    const [nextEntities, nextRelations] = await Promise.all([listActiveEntities(), listRelations()])
    setEntities(nextEntities)
    setRelations(nextRelations)
    setFromEntityId((current) => current || nextEntities[0]?.id || '')
    setToEntityId((current) => current || nextEntities[1]?.id || '')
  }

  useEffect(() => {
    async function initialize() {
      try {
        await ensureDefaultBoard()
        await refresh()
      } catch {
        setError('Не удалось открыть локальную базу данных.')
      } finally {
        setLoading(false)
      }
    }
    void initialize()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await createEntity({ title, type, description })
      setTitle('')
      setDescription('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось создать объект.')
    }
  }

  async function handleRelationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRelationError('')
    try {
      await createRelation({ fromEntityId, toEntityId, type: relationType })
      await refresh()
    } catch (cause) {
      setRelationError(cause instanceof Error ? cause.message : 'Не удалось создать связь.')
    }
  }

  async function handleArchive(id: string) {
    if (!window.confirm('Переместить объект в архив? Его связи также будут удалены.')) return
    await archiveEntity(id)
    await refresh()
  }

  async function handleDeleteRelation(id: string) {
    await deleteRelation(id)
    await refresh()
  }

  const visibleEntities = entities.filter((entity) => {
    const matchesType = filterType === 'all' || entity.type === filterType
    const query = search.trim().toLocaleLowerCase()
    const matchesSearch = !query || entity.title.toLocaleLowerCase().includes(query) || entity.description.toLocaleLowerCase().includes(query)
    return matchesType && matchesSearch
  })

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Nodebase home"><span className="brand-mark">N</span><span>nodebase</span></a>
        <span className="topbar-label">PERSONAL KNOWLEDGE & PROJECT OS</span>
        <span className="local-status"><i /> LOCAL DATABASE</span>
      </header>

      <section className="intro">
        <p className="eyebrow">YOUR SECOND BRAIN, STRUCTURED</p>
        <h1>Всё связано.<br /><span>Ничего не теряется.</span></h1>
        <p className="intro-copy">Единое пространство для проектов, людей, идей и знаний.</p>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div><p className="eyebrow">WORKSPACE / 001</p><h2>Моя база</h2></div>
          <span className="count">{entities.length.toString().padStart(2, '0')} OBJECTS · {relations.length.toString().padStart(2, '0')} LINKS</span>
        </div>

        <form className="create-panel" onSubmit={handleSubmit}>
          <div className="panel-title"><span className="plus">+</span><div><strong>Новый объект</strong><small>Добавьте элемент в свою базу</small></div></div>
          <div className="form-grid">
            <label className="field title-field"><span>Название</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Guchigengovo" required /></label>
            <label className="field"><span>Тип объекта</span><select value={type} onChange={(event) => setType(event.target.value as EntityType)}>{ENTITY_TYPES.map((item) => <option key={item} value={item}>{ENTITY_TYPE_LABELS[item]}</option>)}</select></label>
          </div>
          <label className="field description-field"><span>Описание <em>необязательно</em></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Краткий контекст или заметка" /></label>
          {error && <p className="error">{error}</p>}
          <div className="form-footer"><span>Данные сохраняются в этом браузере</span><button type="submit">Создать объект <b>↗</b></button></div>
        </form>

        <div className="list-heading"><h3>Объекты базы</h3><span>ПОИСК И ФИЛЬТРАЦИЯ</span></div>
        <div className="toolbar">
          <input aria-label="Поиск объектов" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти объект или описание..." />
          <select aria-label="Фильтр по типу" value={filterType} onChange={(event) => setFilterType(event.target.value as EntityType | 'all')}>
            <option value="all">Все типы</option>{ENTITY_TYPES.map((item) => <option key={item} value={item}>{ENTITY_TYPE_LABELS[item]}</option>)}
          </select>
        </div>

        {loading ? <p className="empty-state">Загрузка базы...</p> : visibleEntities.length === 0 ? (
          <div className="empty-state"><span className="empty-symbol">◇</span><strong>{entities.length ? 'Ничего не найдено' : 'Пока здесь пусто'}</strong><p>{entities.length ? 'Измените поисковый запрос или фильтр.' : 'Создайте первый объект. Позже его можно будет связать с другими и разместить на разных досках.'}</p></div>
        ) : (
          <div className="entity-list">
            {visibleEntities.map((entity) => {
              const connected = relations.filter((relation) => relation.fromEntityId === entity.id || relation.toEntityId === entity.id)
              return <article className="entity-card" key={entity.id}>
                <div className="entity-icon">{ENTITY_TYPE_LABELS[entity.type].slice(0, 1)}</div>
                <div className="entity-main"><span className="entity-type">{ENTITY_TYPE_LABELS[entity.type]} · {connected.length} СВЯЗЕЙ</span><strong>{entity.title}</strong>{entity.description && <p>{entity.description}</p>}</div>
                <button className="archive-button" onClick={() => void handleArchive(entity.id)} type="button">В архив</button>
              </article>
            })}
          </div>
        )}

        <div className="list-heading relation-heading"><h3>Связи между объектами</h3><span>{relations.length.toString().padStart(2, '0')} RELATIONS</span></div>
        <form className="create-panel relation-panel" onSubmit={handleRelationSubmit}>
          <div className="panel-title"><span className="plus">↔</span><div><strong>Новая связь</strong><small>Соедините два объекта и укажите характер отношения</small></div></div>
          <div className="relation-grid">
            <label className="field"><span>От объекта</span><select value={fromEntityId} onChange={(event) => setFromEntityId(event.target.value)} required><option value="" disabled>Выберите объект</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.title}</option>)}</select></label>
            <label className="field"><span>Тип связи</span><select value={relationType} onChange={(event) => setRelationType(event.target.value as RelationType)}>{RELATION_TYPES.map((item) => <option key={item} value={item}>{RELATION_TYPE_LABELS[item]}</option>)}</select></label>
            <label className="field"><span>К объекту</span><select value={toEntityId} onChange={(event) => setToEntityId(event.target.value)} required><option value="" disabled>Выберите объект</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.title}</option>)}</select></label>
          </div>
          {relationError && <p className="error">{relationError}</p>}
          <div className="form-footer"><span>Связи сохраняются в локальной базе</span><button type="submit" disabled={entities.length < 2}>Создать связь <b>↗</b></button></div>
        </form>
        {relations.length === 0 ? <div className="empty-state relation-empty"><strong>Связей пока нет</strong><p>Добавьте минимум два объекта, чтобы соединить их.</p></div> : (
          <div className="relation-list">{relations.map((relation) => {
            const from = entityById.get(relation.fromEntityId)
            const to = entityById.get(relation.toEntityId)
            if (!from || !to) return null
            return <article className="relation-card" key={relation.id}><div className="relation-endpoint"><small>{ENTITY_TYPE_LABELS[from.type]}</small><strong>{from.title}</strong></div><div className="relation-arrow"><span>{RELATION_TYPE_LABELS[relation.type as RelationType] ?? relation.type}</span><b>→</b></div><div className="relation-endpoint"><small>{ENTITY_TYPE_LABELS[to.type]}</small><strong>{to.title}</strong></div><button className="archive-button" type="button" onClick={() => void handleDeleteRelation(relation.id)}>Удалить</button></article>
          })}</div>
        )}
      </section>
      <footer className="footer"><span>NODEBASE / 0.2.0</span><span>BUILT FOR CONNECTIONS</span></footer>
    </main>
  )
}
