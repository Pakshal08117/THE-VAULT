"""
Category model — user-scoped writing folders.

Normalization: 3NF — every non-key attribute depends only on the PK.
Slug is derived from name at write time; stored separately for O(1) URL routing.

PostgreSQL migration notes:
  - Unique constraint (user_id, slug) maps to: UNIQUE (user_id, slug)
  - color_hex CHECK can be added as: CHECK (color_hex ~ '^#[0-9a-fA-F]{6}$')
"""
import uuid
from datetime import datetime, timezone
from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id        = db.Column(db.String(36), primary_key=True,
                          default=lambda: str(uuid.uuid4()))
    user_id   = db.Column(db.String(36),
                          db.ForeignKey("users.id", ondelete="CASCADE"),
                          nullable=False)
    name      = db.Column(db.String(100), nullable=False)
    slug      = db.Column(db.String(100), nullable=False)
    color_hex = db.Column(db.String(7),  nullable=False, default="#d4af37")
    icon      = db.Column(db.String(50), nullable=True)    # emoji / icon key
    created_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           nullable=False)

    __table_args__ = (
        # Composite UNIQUE — prevents two folders with same slug per user
        db.UniqueConstraint("user_id", "slug", name="uq_user_category_slug"),
        # Fast JOIN from writings → categories
        db.Index("idx_categories_user_id", "user_id"),
    )

    def to_dict(self) -> dict:
        return {
            "id":        self.id,
            "user_id":   self.user_id,
            "name":      self.name,
            "slug":      self.slug,
            "color_hex": self.color_hex,
            "icon":      self.icon,
            "created_at": self.created_at.isoformat(),
        }
