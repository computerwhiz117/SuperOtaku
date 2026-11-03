# SuperOtaku 📺🎮

Track every anime you watch and every game you beat. Flask (API + SQLite) backend, React (Vite) frontend.

## Project layout

```
superotaku/
├── backend/    # Flask REST API, SQLite database
│   ├── app.py
│   └── requirements.txt
└── frontend/   # React app (Vite)
    └── src/
```

## Running it

**Terminal 1 — backend (http://localhost:5001):**
```bash
cd backend
python3 -m venv venv            # first time only
./venv/bin/pip install -r requirements.txt   # first time only
./venv/bin/python app.py
```

**Terminal 2 — frontend (http://localhost:5173):**
```bash
cd frontend
npm install     # first time only
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to Flask.

## API

| Method | Route | What it does |
|---|---|---|
| GET | `/api/items?type=anime\|game&status=planned\|in_progress\|completed` | List items (filters optional) |
| POST | `/api/items` | Add item: `{"title", "media_type"}` |
| PATCH | `/api/items/<id>` | Update `status`, `rating` (1–10), `title`, `notes` |
| DELETE | `/api/items/<id>` | Remove item |
| GET | `/api/stats` | Completion counts for anime and games |

Setting `status` to `completed` marks an anime as finished / a game as beaten and records the completion time. Ratings unlock once an item is completed.
