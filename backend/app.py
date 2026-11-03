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


class MediaItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    media_type = db.Column(db.String(10), nullable=False)  # anime | game
    status = db.Column(db.String(20), nullable=False, default="planned")
    rating = db.Column(db.Integer, nullable=True)  # 1-10
    notes = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)

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
        }


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

if __name__ == "__main__":
    app.run(port=5001, debug=True)
