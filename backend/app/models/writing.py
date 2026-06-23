"""
Writing model — core content entity.  Fully normalized (3NF).

Association table writing_tags implements M:N decomposition to eliminate
multivalued attributes (1NF violation if stored as comma-separated).

Key indexes:
  idx_writings_user_status  → (user_id, is_archived, is_favorite)
    Used by: dashboard (active), favorites page, archive page — 3-column
    covering index covers all three filter dimensions in one B-tree scan.

  idx_writings_user_created → (user_id, created_at DESC)
    Used by: paginated "recent writings" queries — avoids full-table sort.

  idx_writings_user_type    → (user_id, content_type)
    Used by: type filter (POEM / SHAYARI / etc.) — selective predicate.

  idx_writings_updated      → (user_id, updated_at DESC)
    Used by: "last edited" sort order.

PostgreSQL migration notes:
  - Add GIN full-text index:
      CREATE INDEX idx_writings_fts ON writings
      USING GIN (to_tsvector('english', title || ' ' || content));
  - is_favorite / is_archived: INTEGER(0/1) in SQLite → BOOLEAN in PG
  - content_type CHECK: already enforced at app layer; add DB CHECK in PG
"""
import uuid
from datetime import datetime, timezone
from app.extensions import db

# ── M:N association table (writing ↔ tag) ────────────────────────────────────
writing_tags = db.Table(
    "writing_tags",
    db.Column(
        "writing_id", db.String(36),
        db.ForeignKey("writings.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "tag_id", db.String(36),
        db.ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    # Covering index for tag→writing lookups (reverse join direction)
    db.Index("idx_writing_tags_tag_id", "tag_id"),
)

# Allowed content type values (enforced at application layer)
CONTENT_TYPES = ("SHAYARI", "POEM", "QUOTE", "THOUGHT", "JOURNAL", "NOTE")


class Writing(db.Model):
    __tablename__ = "writings"

    id           = db.Column(db.String(36), primary_key=True,
                             default=lambda: str(uuid.uuid4()))
    user_id      = db.Column(db.String(36),
                             db.ForeignKey("users.id", ondelete="CASCADE"),
                             nullable=False)
    category_id  = db.Column(db.String(36),
                             db.ForeignKey("categories.id", ondelete="SET NULL"),
                             nullable=True)
    title        = db.Column(db.String(255), nullable=False)
    content      = db.Column(db.Text,        nullable=False)
    content_type = db.Column(db.String(50),  nullable=False)   # enum enforced in app
    is_favorite  = db.Column(db.Boolean, default=False, nullable=False)
    is_archived  = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted   = db.Column(db.Boolean, default=False, nullable=False) # Soft delete
    deleted_at   = db.Column(db.DateTime, nullable=True)
    word_count   = db.Column(db.Integer, default=0,     nullable=False)  # denormalized for perf
    created_at   = db.Column(db.DateTime,
                             default=lambda: datetime.now(timezone.utc),
                             nullable=False)
    updated_at   = db.Column(db.DateTime,
                             default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc),
                             nullable=False)

    # ── Composite indexes ─────────────────────────────────────────────────────
    __table_args__ = (
        # Primary dashboard filter: active writings per user
        db.Index("idx_writings_user_status",
                 "user_id", "is_archived", "is_favorite"),
        # Paginated recent-first ordering
        db.Index("idx_writings_user_created",
                 "user_id", "created_at"),
        # Type-based filtering (POEM, SHAYARI, etc.)
        db.Index("idx_writings_user_type",
                 "user_id", "content_type"),
        # Last-edited sort
        db.Index("idx_writings_updated",
                 "user_id", "updated_at"),
        # Category join
        db.Index("idx_writings_category_id", "category_id"),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    category    = db.relationship("Category", lazy=True)
    tags        = db.relationship("Tag", secondary=writing_tags,
                                  backref=db.backref("writings", lazy="dynamic"),
                                  lazy="subquery")
    share_links = db.relationship("ShareLink", backref="writing",
                                  lazy=True, cascade="all, delete-orphan")

    # ── Helpers ───────────────────────────────────────────────────────────────
    def compute_word_count(self) -> int:
        """Strip HTML tags, count whitespace-delimited words."""
        import re
        text = re.sub(r"<[^>]+>", " ", self.content or "")
        return len(text.split())

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "user_id":      self.user_id,
            "category_id":  self.category_id,
            "category":     self.category.to_dict() if self.category else None,
            "title":        self.title,
            "content":      self.content,
            "content_type": self.content_type,
            "is_favorite":  self.is_favorite,
            "is_archived":  self.is_archived,
            "is_deleted":   self.is_deleted,
            "deleted_at":   self.deleted_at.isoformat() if self.deleted_at else None,
            "word_count":   self.word_count,
            "tags":         [tag.to_dict() for tag in self.tags],
            "share_links":  [link.to_dict() for link in self.share_links],
            "created_at":   self.created_at.isoformat(),
            "updated_at":   self.updated_at.isoformat(),
        }
