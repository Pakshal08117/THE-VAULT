"""
ShareLink model — secure public exposure with optional passcode, TTL,
view-count limits, and brute-force lockout.

Share Modes:
  public       — open access, anyone with the URL can read
  passcode     — bcrypt-gated, reader must supply the correct passcode
  expiring     — time-bounded link, auto-revokes at expires_at
  view_limited — auto-revokes once view_count >= max_views

Modes are combinable (e.g. passcode + expiring + view_limited simultaneously).

Brute-Force Protection:
  - failed_attempts tracks incorrect passcode submissions per link
  - After MAX_FAILED_ATTEMPTS (5), locked_until is set to now + LOCKOUT_MINUTES (15)
  - Any unlock attempt while locked_until > now returns 429

Design decisions:
  - access_token is a UUID v4, stored as TEXT. Unique index ensures O(log N)
    public lookup without exposing internal writing IDs.
  - passcode_hash uses bcrypt (cost=12) — never stored in plaintext.
  - expires_at is stored as naive UTC datetime; .is_expired property adds tzinfo.
  - view_count is an append-only counter; no locking needed for SQLite since
    writes are serialized. In PostgreSQL use: UPDATE ... SET view_count = view_count + 1.

Indexes:
  idx_share_links_token   → (access_token) — public share lookup
  idx_share_links_writing → (writing_id)   — list all shares for a writing
  idx_share_links_active  → (is_active)    — filter revoked links

PostgreSQL migration notes:
  - expires_at / locked_until / last_viewed_at: DateTime → TIMESTAMPTZ
  - passcode_hash: TEXT(255) — keep as-is (bcrypt output is always 60 chars)
  - share_mode: add CHECK constraint
"""
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from app.extensions import db

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

VALID_SHARE_MODES = ("public", "passcode", "expiring", "view_limited")


class ShareLink(db.Model):
    __tablename__ = "share_links"

    id            = db.Column(db.String(36), primary_key=True,
                              default=lambda: str(uuid.uuid4()))
    writing_id    = db.Column(db.String(36),
                              db.ForeignKey("writings.id", ondelete="CASCADE"),
                              nullable=False)
    access_token  = db.Column(db.String(36), unique=True, nullable=False,
                              default=lambda: str(uuid.uuid4()))

    # ── Share mode ───────────────────────────────────────────────────────────
    share_mode    = db.Column(db.String(20), nullable=False, default="public")

    # ── Passcode protection ───────────────────────────────────────────────────
    passcode_hash = db.Column(db.String(255), nullable=True)

    # ── Expiry ───────────────────────────────────────────────────────────────
    expires_at    = db.Column(db.DateTime,   nullable=True)

    # ── View limiting ────────────────────────────────────────────────────────
    view_count     = db.Column(db.Integer,   default=0,    nullable=False)
    max_views      = db.Column(db.Integer,   nullable=True)   # None = unlimited
    last_viewed_at = db.Column(db.DateTime,  nullable=True)

    # ── Brute-force protection ────────────────────────────────────────────────
    failed_attempts = db.Column(db.Integer,  default=0,    nullable=False)
    locked_until    = db.Column(db.DateTime, nullable=True)

    # ── Status ───────────────────────────────────────────────────────────────
    is_active     = db.Column(db.Boolean,    default=True, nullable=False)
    created_at    = db.Column(db.DateTime,
                              default=lambda: datetime.now(timezone.utc),
                              nullable=False)

    __table_args__ = (
        db.Index("idx_share_links_token",   "access_token"),
        db.Index("idx_share_links_writing", "writing_id"),
        db.Index("idx_share_links_active",  "is_active"),
        db.Index("idx_share_links_mode",    "share_mode"),
    )

    # ── Computed properties ───────────────────────────────────────────────────
    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        now = datetime.now(timezone.utc)
        exp = (self.expires_at.replace(tzinfo=timezone.utc)
               if self.expires_at.tzinfo is None else self.expires_at)
        return now > exp

    @property
    def is_view_exhausted(self) -> bool:
        if self.max_views is None:
            return False
        return self.view_count >= self.max_views

    @property
    def is_brute_force_locked(self) -> bool:
        if not self.locked_until:
            return False
        now = datetime.now(timezone.utc)
        lock_time = (self.locked_until.replace(tzinfo=timezone.utc)
                     if self.locked_until.tzinfo is None else self.locked_until)
        return now < lock_time

    @property
    def lockout_seconds_remaining(self) -> int:
        if not self.is_brute_force_locked or not self.locked_until:
            return 0
        now = datetime.now(timezone.utc)
        lock_time = (self.locked_until.replace(tzinfo=timezone.utc)
                     if self.locked_until.tzinfo is None else self.locked_until)
        return max(0, int((lock_time - now).total_seconds()))

    @property
    def views_remaining(self):
        if self.max_views is None:
            return None
        return max(0, self.max_views - self.view_count)

    # ── Passcode helpers ──────────────────────────────────────────────────────
    def set_passcode(self, passcode: str | None) -> None:
        if not passcode:
            self.passcode_hash = None
            return
        salt   = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(passcode.encode("utf-8"), salt)
        self.passcode_hash = hashed.decode("utf-8")

    def check_passcode(self, passcode: str | None) -> bool:
        """
        Verify passcode and manage brute-force counters.
        Returns True on success, False on failure.
        Caller must commit after calling.
        """
        if not self.passcode_hash:
            return True

        if not passcode:
            return False

        try:
            ok = bcrypt.checkpw(
                passcode.encode("utf-8"),
                self.passcode_hash.encode("utf-8")
            )
        except Exception:
            return False

        if ok:
            self.failed_attempts = 0
            self.locked_until = None
            return True
        else:
            self.failed_attempts = (self.failed_attempts or 0) + 1
            if self.failed_attempts >= MAX_FAILED_ATTEMPTS:
                self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
                self.failed_attempts = 0
            return False

    # ── View tracking & auto-revoke ───────────────────────────────────────────
    def record_view(self) -> None:
        """
        Increment view_count, update last_viewed_at, and auto-revoke if
        max_views has been reached. Caller must commit after calling.
        """
        self.view_count += 1
        self.last_viewed_at = datetime.now(timezone.utc)
        if self.max_views is not None and self.view_count >= self.max_views:
            self.is_active = False

    # ── Serialization ─────────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "id":                self.id,
            "writing_id":        self.writing_id,
            "access_token":      self.access_token,
            "share_mode":        self.share_mode,
            "has_passcode":      self.passcode_hash is not None,
            "expires_at":        self.expires_at.isoformat() if self.expires_at else None,
            "view_count":        self.view_count,
            "max_views":         self.max_views,
            "views_remaining":   self.views_remaining,
            "last_viewed_at":    self.last_viewed_at.isoformat() if self.last_viewed_at else None,
            "failed_attempts":   self.failed_attempts,
            "is_locked":         self.is_brute_force_locked,
            "lockout_seconds":   self.lockout_seconds_remaining,
            "is_active":         self.is_active,
            "is_expired":        self.is_expired,
            "is_view_exhausted": self.is_view_exhausted,
            "created_at":        self.created_at.isoformat(),
        }
