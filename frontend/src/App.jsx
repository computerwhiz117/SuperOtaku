import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import Mascot from './components/Mascot'
import './App.css'

const STATUS_LABELS = {
  planned: { anime: 'Plan to watch', game: 'Plan to play' },
  in_progress: { anime: 'Watching', game: 'Playing' },
  completed: { anime: 'Finished ✓', game: 'Beaten ✓' },
}

function statusLabel(status, mediaType) {
  return STATUS_LABELS[status]?.[mediaType] ?? status
}

function AddForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [mediaType, setMediaType] = useState('anime')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await onAdd({ title: title.trim(), media_type: mediaType })
      setTitle('')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={mediaType === 'anime' ? 'Add an anime… e.g. Frieren' : 'Add a game… e.g. Elden Ring'}
      />
      <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
        <option value="anime">📺 Anime</option>
        <option value="game">🎮 Game</option>
      </select>
      <button type="submit">Add</button>
      {error && <span className="error">{error}</span>}
    </form>
  )
}

function RatingStars({ item, onRate }) {
  if (item.status !== 'completed') return null
  return (
    <div className="rating" title="Rate 1–10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          className={`star ${item.rating >= n ? 'filled' : ''}`}
          onClick={() => onRate(item.id, item.rating === n ? null : n)}
        >
          ★
        </button>
      ))}
      {item.rating && <span className="rating-num">{item.rating}/10</span>}
    </div>
  )
}

function ItemCard({ item, onUpdate, onDelete }) {
  const isDone = item.status === 'completed'
  const nextAction = isDone
    ? { status: 'planned', label: 'Undo' }
    : item.status === 'in_progress'
      ? { status: 'completed', label: item.media_type === 'game' ? '🏆 Beat it!' : '🎉 Finished it!' }
      : { status: 'in_progress', label: item.media_type === 'game' ? '▶ Start playing' : '▶ Start watching' }

  return (
    <li className={`card ${isDone ? 'done' : ''}`}>
      <div className="card-main">
        <span className="type-badge">{item.media_type === 'anime' ? '📺' : '🎮'}</span>
        <div className="card-text">
          <Link to={`/items/${item.id}`}><h3>{item.title}</h3></Link>
          <span className={`status status-${item.status}`}>
            {statusLabel(item.status, item.media_type)}
          </span>
        </div>
        <div className="card-actions">
          <button className="action" onClick={() => onUpdate(item.id, { status: nextAction.status })}>
            {nextAction.label}
          </button>
          <button className="delete" title="Delete" onClick={() => onDelete(item.id)}>✕</button>
        </div>
      </div>
      <RatingStars item={item} onRate={(id, rating) => onUpdate(id, { rating })} />
    </li>
  )
}

export default function App() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([
        api.listItems({ type: typeFilter, status: statusFilter }),
        api.stats(),
      ])
      setItems(list)
      setStats(s)
      setError('')
    } catch (err) {
      setError(`Could not reach the server — is Flask running? (${err.message})`)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => { refresh() }, [refresh])

  const addItem = async (data) => { await api.createItem(data); refresh() }
  const updateItem = async (id, data) => { await api.updateItem(id, data); refresh() }
  const deleteItem = async (id) => { await api.deleteItem(id); refresh() }

  return (
    <div className="app">
      <header>
        <Mascot />
        <h1>Super<span className="accent">Otaku</span></h1>
        <p className="tagline">Track every anime you watch and every game you beat</p>
        {stats && (
          <div className="stats">
            <div className="stat">📺 {stats.anime.completed}/{stats.anime.total} anime finished</div>
            <div className="stat">🎮 {stats.games.completed}/{stats.games.total} games beaten</div>
          </div>
        )}
      </header>

      <AddForm onAdd={addItem} />

      <div className="filters">
        {[['', 'All'], ['anime', '📺 Anime'], ['game', '🎮 Games']].map(([val, label]) => (
          <button key={val} className={typeFilter === val ? 'active' : ''} onClick={() => setTypeFilter(val)}>
            {label}
          </button>
        ))}
        <span className="divider" />
        {[['', 'Any status'], ['planned', 'Planned'], ['in_progress', 'In progress'], ['completed', 'Completed']].map(([val, label]) => (
          <button key={val} className={statusFilter === val ? 'active' : ''} onClick={() => setStatusFilter(val)}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="error banner">{error}</p>}

      <ul className="list">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
        ))}
      </ul>
      {!error && items.length === 0 && (
        <div className="empty">
          <Mascot size={110} />
          <p>Neo-chan is waiting — add your first anime or game above!</p>
        </div>
      )}
    </div>
  )
}
