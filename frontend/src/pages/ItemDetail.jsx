import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import Mascot from '../components/Mascot'

function parseVoiceActors(raw) {
  if (Array.isArray(raw)) return raw
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function DescriptionSection({ item, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.description || '')

  const save = async () => {
    await onSave({ description: draft })
    setEditing(false)
  }

  return (
    <section className="detail-section">
      <h2>Description</h2>
      {editing ? (
        <>
          <textarea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a description…"
          />
          <div className="detail-actions">
            <button className="action" onClick={save}>Save</button>
            <button onClick={() => { setDraft(item.description || ''); setEditing(false) }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="description">{item.description || 'No description yet.'}</p>
          <button className="action" onClick={() => setEditing(true)}>
            {item.description ? 'Edit description' : 'Add description'}
          </button>
        </>
      )}
    </section>
  )
}

function VoiceActorsSection({ item, onSave }) {
  const [name, setName] = useState('')
  const [character, setCharacter] = useState('')
  const actors = parseVoiceActors(item.voice_actors)

  const addActor = async (e) => {
    e.preventDefault()
    if (!name.trim() || !character.trim()) return
    const next = [...actors, { name: name.trim(), character: character.trim() }]
    await onSave({ voice_actors: JSON.stringify(next) })
    setName('')
    setCharacter('')
  }

  const removeActor = async (index) => {
    const next = actors.filter((_, i) => i !== index)
    await onSave({ voice_actors: JSON.stringify(next) })
  }

  return (
    <section className="detail-section">
      <h2>Voice Actors</h2>
      {actors.length === 0 && <p className="muted">No voice actors added yet.</p>}
      <ul className="voice-actors">
        {actors.map((va, i) => (
          <li key={i}>
            <strong>{va.name}</strong> as {va.character}
            <button className="delete" title="Remove" onClick={() => removeActor(i)}>✕</button>
          </li>
        ))}
      </ul>
      <form className="add-form" onSubmit={addActor}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Voice actor name" />
        <input value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="Character" />
        <button type="submit">Add</button>
      </form>
    </section>
  )
}

function CommentsSection({ comments, onAdd, onDelete }) {
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    try {
      await onAdd({ author: author.trim() || 'Anonymous', body: body.trim() })
      setBody('')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="detail-section">
      <h2>Comments ({comments.length})</h2>
      <form className="add-form" onSubmit={submit}>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name (optional)" />
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" />
        <button type="submit">Post</button>
        {error && <span className="error">{error}</span>}
      </form>
      <ul className="comments">
        {comments.map((c) => (
          <li key={c.id} className="comment">
            <div>
              <strong>{c.author}</strong>
              <span className="muted"> · {c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
              <p>{c.body}</p>
            </div>
            <button className="delete" title="Delete" onClick={() => onDelete(c.id)}>✕</button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ItemDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [comments, setComments] = useState([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [it, cs] = await Promise.all([api.getItem(id), api.listComments(id)])
      setItem(it)
      setComments(cs)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const saveItem = async (data) => { await api.updateItem(id, data); refresh() }
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const autoFill  = async () => {
    setFetching(true)
    setFetchError('')
    try {
      const info = await api.lookup(item.media_type, item.title)
      await api.updateItem(id, {
        description: info.description,
        voice_actors: JSON.stringify(info.voice_actors),
      })
      refresh()
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setFetching(false)
    }
  }
  const addComment = async (data) => { await api.addComment(id, data); refresh() }
  const deleteComment = async (commentId) => { await api.deleteComment(commentId); refresh() }

  if (error) {
    return (
      <div className="app detail-page">
        <Link to="/" className="back-link">← Back to list</Link>
        <p className="error banner">{error}</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="app detail-page">
        <Link to="/" className="back-link">← Back to list</Link>
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="app detail-page">
      <Link to="/" className="back-link">← Back to list</Link>
      <header>
        <Mascot size={80} />
        <h1>
          <span className="type-badge">{item.media_type === 'anime' ? '📺' : '🎮'}</span> {item.title}
        </h1>
        <span className={`status status-${item.status}`}>{item.status.replace('_', ' ')}</span>
        {item.rating && <span className="rating-num">★ {item.rating}/10</span>}
      </header>

      <button className="action" onClick={autoFill} disabled={fetching}>
        {fetching
        ? 'Fetching...'
        : item.media_type === 'anime' ? 'Auto-fill from AniList' : 'Auto-fill from RAWG'}
      </button>
      {fetchError && <span className="error">{fetchError}</span>}

      <DescriptionSection item={item} onSave={saveItem} />
      <VoiceActorsSection item={item} onSave={saveItem} />
      <CommentsSection comments={comments} onAdd={addComment} onDelete={deleteComment} />
    </div>
  )
}
