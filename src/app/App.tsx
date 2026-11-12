import { useEffect, useState, type FormEvent } from 'react'
import { createEntity, listActiveEntities, archiveEntity } from '../application/entities'
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, type Entity, type EntityType } from '../domain/models'
import { ensureDefaultBoard } from '../infrastructure/database'
import './app.css'

export default function App() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EntityType>('project')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setEntities(await listActiveEntities())
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

  async function handleArchive(id: string) {
    await archiveEntity(id)
    await refresh()
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Nodebase home">
          <span className="brand-mark">N</span>
          <span>nodebase</span>
        </a>
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
          <div>
            <p className="eyebrow">WORKSPACE / 001</p>
            <h2>Моя база</h2>
          </div>
          <span className="count">{entities.length.toString().padStart(2, '0')} OBJECTS</span>
        </div>

        <form className="create-panel" onSubmit={handleSubmit}>
          <div className="panel-title">
            <span className="plus">+</span>
            <div>
              <strong>Новый объект</strong>
              <small>Добавьте элемент в свою базу</small>
            </div>
          </div>
          <div className="form-grid">
            <label className="field title-field">
              <span>Название</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Guchigengovo" required />
            </label>
            <label className="field">
              <span>Тип объекта</span>
              <select value={type} onChange={(event) => setType(event.target.value as EntityType)}>
                {ENTITY_TYPES.map((item) => <option key={item} value={item}>{ENTITY_TYPE_LABELS[item]}</option>)}
              </select>
            </label>
          </div>
          <label className="field description-field">
            <span>Описание <em>необязательно</em></span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Краткий контекст или заметка" />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="form-footer">
            <span>Данные сохраняются в этом браузере</span>
            <button type="submit">Создать объект <b>↗</b></button>
          </div>
        </form>

        <div className="list-heading">
          <h3>Объекты базы</h3>
          <span>СНАЧАЛА СУЩНОСТИ, ПОТОМ СВЯЗИ</span>
        </div>

        {loading ? <p className="empty-state">Загрузка базы...</p> : entities.length === 0 ? (
          <div className="empty-state">
            <span className="empty-symbol">◇</span>
            <strong>Пока здесь пусто</strong>
            <p>Создайте первый объект. Позже его можно будет связать с другими и разместить на разных досках.</p>
          </div>
        ) : (
          <div className="entity-list">
            {entities.map((entity) => (
              <article className="entity-card" key={entity.id}>
                <div className="entity-icon">{ENTITY_TYPE_LABELS[entity.type].slice(0, 1)}</div>
                <div className="entity-main">
                  <span className="entity-type">{ENTITY_TYPE_LABELS[entity.type]}</span>
                  <strong>{entity.title}</strong>
                  {entity.description && <p>{entity.description}</p>}
                </div>
                <button className="archive-button" onClick={() => void handleArchive(entity.id)} type="button">В архив</button>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="footer"><span>NODEBASE / 0.1.0</span><span>BUILT FOR CONNECTIONS</span></footer>
    </main>
  )
}