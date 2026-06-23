"""
TokenBlock model — JWT JTI revocation list.

Design notes:
  - Integer autoincrement PK (not UUID) — this table is an append-only log;
    sequential inserts are more cache-friendly for B-tree index maintenance.
  - jti is VARCHAR(36) (UUID format from flask-jwt-extended).
  - created_at allows scheduled cleanup: DELETE FROM token_block
    WHERE created_at < (now - max_token_ttl).

Index:
  idx_token_block_jti → (jti) — O(log N) per-request token check.

PostgreSQL migration notes:
  - id: SERIAL PRIMARY KEY → BIGSERIAL PRIMARY KEY (large deployments)
  - Add scheduled pg_cron job to purge expired JTIs.
"""
from datetime import datetime, timezone
from app.extensions import db


class TokenBlock(db.Model):
    __tablename__ = "token_block"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    jti        = db.Column(db.String(36), nullable=False, unique=True)
    token_type = db.Column(db.String(10), nullable=False, default="access")  # access | refresh
    created_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           nullable=False)

    __table_args__ = (
        db.Index("idx_token_block_jti",        "jti"),          # per-request blocklist check
        db.Index("idx_token_block_created_at", "created_at"),   # cleanup queries
    )

    def __init__(self, jti: str, token_type: str = "access") -> None:
        self.jti        = jti
        self.token_type = token_type
