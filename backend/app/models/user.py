"""
User model — normalized, bcrypt-hashed, UUID v4 primary key.

PostgreSQL migration notes:
  - id: TEXT(36)  →  UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - created_at/updated_at: DateTime  →  TIMESTAMPTZ DEFAULT now()
  - Index on email already present; add partial index on active status if needed.
"""
import uuid
from datetime import datetime, timezone
import bcrypt
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.String(36), primary_key=True,
                              default=lambda: str(uuid.uuid4()))
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name  = db.Column(db.String(100), nullable=True)   # optional profile name
    role          = db.Column(db.String(50), nullable=False, default="USER") # "SUPER_ADMIN", "ADMIN", "USER"
    created_at    = db.Column(db.DateTime,
                              default=lambda: datetime.now(timezone.utc),
                              nullable=False)
    updated_at    = db.Column(db.DateTime,
                              default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc),
                              nullable=False)

    # ── Explicit indexes ──────────────────────────────────────────────────────
    __table_args__ = (
        db.Index("idx_users_email", "email"),          # O(log N) login lookup
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    writings   = db.relationship("Writing",  backref="user", lazy=True,
                                 cascade="all, delete-orphan")
    categories = db.relationship("Category", backref="user", lazy=True,
                                 cascade="all, delete-orphan")
    tags       = db.relationship("Tag",      backref="user", lazy=True,
                                 cascade="all, delete-orphan")

    # ── Security helpers ──────────────────────────────────────────────────────
    def set_password(self, password: str) -> None:
        salt   = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        self.password_hash = hashed.decode("utf-8")

    def check_password(self, password: str) -> bool:
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"),
                self.password_hash.encode("utf-8")
            )
        except Exception:
            return False

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "email":        self.email,
            "display_name": self.display_name,
            "role":         self.role,
            "created_at":   self.created_at.isoformat(),
            "updated_at":   self.updated_at.isoformat(),
        }
