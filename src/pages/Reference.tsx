import { useMemo, useState } from 'react'
import { REFERENCE } from '../data/reference'
import Icon from '../components/Icon'

export default function Reference() {
  const [query, setQuery] = useState('')
  const [openSet, setOpenSet] = useState<Set<string>>(new Set())

  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return REFERENCE.map((c) => ({ ...c, pages: c.pages }))
    return REFERENCE.map((c) => {
      const titleMatch = c.title.toLowerCase().includes(q)
      const pages = titleMatch ? c.pages : c.pages.filter((p) => p.title.toLowerCase().includes(q))
      return { ...c, pages, _match: titleMatch || pages.length > 0 }
    }).filter((c) => (c as any)._match)
  }, [q])

  const toggle = (title: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Справочник</span>
        <h1>Справочник BookStack</h1>
        <p>Каталог статей внутренней базы знаний. Ссылки ведут в BookStack (демо-заглушки, доступ внутри сети).</p>
      </div>

      <input
        className="search"
        placeholder="Поиск по статьям и разделам…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 && <p className="muted">Ничего не найдено.</p>}

      {filtered.map((chapter) => {
        const isOpen = !!q || openSet.has(chapter.title)
        return (
          <div className="chapter" key={chapter.title}>
            <div className="chapter__head" onClick={() => toggle(chapter.title)}>
              <span className="chapter__title">
                <Icon name={isOpen ? 'folderOpen' : 'folder'} size={17} />
                <a href={chapter.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  {chapter.title}
                </a>
              </span>
              <span className="chapter__count">{chapter.pages.length}</span>
            </div>
            {isOpen && (
              <div className="chapter__pages">
                {chapter.pages.map((p) => (
                  <a className="page-link" key={p.href} href={p.href} target="_blank" rel="noreferrer">
                    {p.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
