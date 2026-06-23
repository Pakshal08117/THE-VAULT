"""
Tag model — user-scoped labels for cross-category classification.

Normalization: 3NF — slug derived at write time, stored for index efficiency.

PostgreSQL migration notes:
  - Unique constraint (user_id, slug) maps to: UNIQUE (user_id, slug)
  - For FTS tag search: add GIN index on to_tsvector('simple', name)
"""
import uuid
from datetime import datetime, timezone
from app.extensions import db


class Tag(db.Model):
    __tablename__ = "tags"

    id        = db.Column(db.String(36), primary_key=True,
                          default=lambda: str(uuid.uuid4()))
    user_id   = db.Column(db.String(36),
                          db.ForeignKey("users.id", ondelete="CASCADE"),
                          nullable=False)
    name      = db.Column(db.String(100), nullable=False)
    slug      = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           nullable=False)

    __table_args__ = (
        # Composite UNIQUE — prevents duplicate labels per user
        db.UniqueConstraint("user_id", "slug", name="uq_user_tag_slug"),
        # Fast JOIN from writing_tags → tags
        db.Index("idx_tags_user_id", "user_id"),
    )

    def to_dict(self) -> dict:
        return {
            "id":        self.id,
            "user_id":   self.user_id,
            "name":      self.name,
            "slug":      self.slug,
            "created_at": self.created_at.isoformat(),
        }
