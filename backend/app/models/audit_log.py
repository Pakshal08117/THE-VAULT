import uuid
from datetime import datetime, timezone
from app.extensions import db

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_id = db.Column(db.String(36), nullable=True) # ID of user, writing, etc. affected
    action = db.Column(db.String(100), nullable=False) # e.g. "WRITING_RESTORE", "USER_PROMOTE"
    details = db.Column(db.Text, nullable=True) # JSON or text details
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    admin = db.relationship("User", backref="audit_logs", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "target_id": self.target_id,
            "action": self.action,
            "details": self.details,
            "created_at": self.created_at.isoformat()
        }
