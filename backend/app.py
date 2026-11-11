import os
import re
from pathlib import Path

import requests


def _load_dotenv():
    """Load KEY=value pairs from backend/.env into os.environ (no overwrite)."""
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()

RAWG_API_KEY = os.environ.get("RAWG_API_KEY", "")
ANILIST_URL = "https://graphql.anilist.co"

from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///superotaku.db"
CORS(app)
db = SQLAlchemy(app)

MEDIA_TYPES = {"anime", "game"}
STATUSES = {"planned", "in_progress", "completed"}

ANILIST_QUERY = """
query ($search: String) {
  Media(search: $search, type: ANIME) {
    title { romaji english }
    description(asHtml: false)
    coverImage { large }
    externalLinks { site url type }
    characters(sort: ROLE, perPage: 12) {
      edges {
        node { name { full } }
        voiceActors(language: JAPANESE) { name { full } }
      }
    }
  }
}
"""
@app.get("/api/lookup/anime")
def lookup_anime():
    title = (request.args.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400
    try:
        resp = requests.post(
            ANILIST_URL,
            json={"query": ANILIST_QUERY, "variables": {"search": title}},
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        return jsonify({"error": f"AniList request failed: {exc}"}), 502

    media = (resp.json().get("data") or {}).get("Media")
    if not media:
        return jsonify({"error": "no match found on AniList"}), 404

    description = re.sub(r"<[^>]*>", "", media.get("description") or "")

    voice_actors = []
    for edge in (media.get("characters") or {}).get("edges", []):
        vas = edge.get("voiceActors", [])
        if vas:
            voice_actors.append({
                "name": vas[0]["name"]["full"],
                "character": edge["node"]["name"]["full"]
            })

    streaming = [
        {"site": l["site"], "url": l["url"]}
        for l in media.get("externalLinks", [])
        if l.get("type") == "STREAMING"
    ]

    return jsonify({
        "title": media["title"].get("english") or media["title"].get("romaji"),
        "description": description,
        "voice_actors": voice_actors,
        "streaming": streaming,
        "cover_image": (media.get("coverImage") or {}).get("large"),

    })

@app.get("/api/lookup/game")
def lookup_game():
    title = (request.args.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400
    if not RAWG_API_KEY:
        return jsonify({"error": "RAWG API key is not configured on the server"}), 503
    try:
        search = requests.get(
            "https://api.rawg.io/api/games",
            params={"key": RAWG_API_KEY, "search": title}
        )
        search.raise_for_status()
        results = search.json().get("results", [])
        if not results:
            return jsonify({"error": "no match found on RAWG"}), 404
        game_id = results[0]["id"]

        detail = requests.get(
            f"https://api.rawg.io/api/games/{game_id}",
            params={"key": RAWG_API_KEY}
        )
        detail.raise_for_status()
        game = detail.json()
    except requests.RequestException as exc:
        return jsonify({"error": f"RAWG request failed: {exc}"}), 500

    return jsonify({
        "title": game.get("name"),
        "description": game.get("description_raw"),
        "voice_actors": [],
        "platforms": [p["platform"]["name"] for p in game.get("platforms", [])],
        "released": game.get("released"),
        "cover_image": game.get("background_image"),
        "metacritic": game.get("metacritic"),
    })


class MediaItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    media_type = db.Column(db.String(10), nullable=False)  # anime | game
    status = db.Column(db.String(20), nullable=False, default="planned")
    rating = db.Column(db.Integer, nullable=True)  # 1-10
    notes = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)
    description = db.Column(db.Text, default="")
    voice_actors = db.Column(db.Text, default="")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "media_type": self.media_type,
            "status": self.status,
            "rating": self.rating,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "description": self.description,
            "voice_actors": self.voice_actors,
        }


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("media_item.id"), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    item = db.relationship("MediaItem", backref=db.backref("comments", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "author": self.author,
            "body": self.body,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@app.get("/api/items/<int:item_id>")           # single item detail
def get_item(item_id):
    item = db.session.get(MediaItem, item_id)
    if item is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(item.to_dict())

@app.get("/api/items/<int:item_id>/comments")  # list comments
def list_comments(item_id):
    item = db.session.get(MediaItem, item_id)
    if item is None:
        return jsonify({"error": "not found"}), 404
    return jsonify([comment.to_dict() for comment in item.comments])

@app.post("/api/items/<int:item_id>/comments") # add comment ({author, body})
def add_comment(item_id):
    item = db.session.get(MediaItem, item_id)
    if item is None:
        return jsonify({"error": "not found"}), 404
    data = request.get_json(silent=True) or {}
    author = (data.get("author") or "").strip()
    body = (data.get("body") or "").strip()
    if not author or not body:
        return jsonify({"error": "author and body are required"}), 400
    comment = Comment(item_id=item_id, author=author, body=body)
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201

@app.delete("/api/comments/<int:comment_id>")  # delete comment
def delete_comment(comment_id):
    comment = db.session.get(Comment, comment_id)
    if comment is None:
        return jsonify({"error": "not found"}), 404
    db.session.delete(comment)
    db.session.commit()
    return "", 204


@app.get("/api/items")
def list_items():
    query = MediaItem.query
    media_type = request.args.get("type")
    status = request.args.get("status")
    if media_type in MEDIA_TYPES:
        query = query.filter_by(media_type=media_type)
    if status in STATUSES:
        query = query.filter_by(status=status)
    items = query.order_by(MediaItem.created_at.desc()).all()
    return jsonify([item.to_dict() for item in items])


@app.post("/api/items")
def create_item():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    media_type = data.get("media_type")
    if not title:
        return jsonify({"error": "title is required"}), 400
    if media_type not in MEDIA_TYPES:
        return jsonify({"error": "media_type must be 'anime' or 'game'"}), 400
    item = MediaItem(
        title=title,
        media_type=media_type,
        status=data.get("status") if data.get("status") in STATUSES else "planned",
        notes=data.get("notes", ""),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@app.patch("/api/items/<int:item_id>")
def update_item(item_id):
    item = db.session.get(MediaItem, item_id)
    if item is None:
        return jsonify({"error": "not found"}), 404
    data = request.get_json(silent=True) or {}

    if "title" in data and data["title"].strip():
        item.title = data["title"].strip()
    if "status" in data and data["status"] in STATUSES:
        item.status = data["status"]
        item.completed_at = (
            datetime.now(timezone.utc) if data["status"] == "completed" else None
        )
    if "rating" in data:
        rating = data["rating"]
        if rating is None or (isinstance(rating, int) and 1 <= rating <= 10):
            item.rating = rating
    if "notes" in data:
        item.notes = data["notes"]
    if "description" in data:
        item.description = data["description"]
    if "voice_actors" in data:
        item.voice_actors = data["voice_actors"]

    db.session.commit()
    return jsonify(item.to_dict())


@app.delete("/api/items/<int:item_id>")
def delete_item(item_id):
    item = db.session.get(MediaItem, item_id)
    if item is None:
        return jsonify({"error": "not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return "", 204


@app.get("/api/stats")
def stats():
    def count(**kwargs):
        return MediaItem.query.filter_by(**kwargs).count()

    return jsonify({
        "total": MediaItem.query.count(),
        "anime": {
            "total": count(media_type="anime"),
            "completed": count(media_type="anime", status="completed"),
        },
        "games": {
            "total": count(media_type="game"),
            "completed": count(media_type="game", status="completed"),
        },
    })


with app.app_context():
    db.create_all()
    # Lightweight migration: add columns missing from an existing database.
    existing = {row[1] for row in db.session.execute(db.text("PRAGMA table_info(media_item)"))}
    for column in ("description", "voice_actors"):
        if column not in existing:
            db.session.execute(db.text(f"ALTER TABLE media_item ADD COLUMN {column} TEXT DEFAULT ''"))
    db.session.commit()

if __name__ == "__main__":
    app.run(port=5001, debug=True)
