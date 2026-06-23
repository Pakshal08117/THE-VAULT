import os
import glob
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.writing import Writing
from app.models.audit_log import AuditLog
from app.models.share_link import ShareLink
from app.models.site_setting import SiteSetting
from app.utils.decorators import role_required
from sqlalchemy import text

admin_bp = Blueprint("admin", __name__)

def log_admin_action(admin_id, target_id, action, details=""):
    log = AuditLog(
        admin_id=admin_id,
        target_id=target_id,
        action=action,
        details=details
    )
    db.session.add(log)
    db.session.commit()


# ── User Management Endpoints ───────────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def list_users():
    """List users with search and filter capabilities."""
    search = request.args.get("search")
    role = request.args.get("role")
    
    query = User.query
    if search:
        query = query.filter(User.email.ilike(f"%{search}%") | User.display_name.ilike(f"%{search}%"))
    if role:
        query = query.filter_by(role=role)
        
    users = query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
@jwt_required()
@role_required("SUPER_ADMIN")
def update_user_role(user_id):
    """Update role of a single user."""
    data = request.get_json() or {}
    new_role = data.get("role")
    if new_role not in ["SUPER_ADMIN", "ADMIN", "USER"]:
        return jsonify({"message": "Invalid role"}), 400
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    old_role = user.role
    user.role = new_role
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id=user.id,
        action="USER_ROLE_CHANGE",
        details=f"Role changed from {old_role} to {new_role}"
    )
    
    return jsonify({"message": "Role updated successfully", "user": user.to_dict()}), 200


@admin_bp.route("/users/bulk-role", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN")
def bulk_update_user_roles():
    """Bulk update roles for multiple users."""
    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])
    new_role = data.get("role")
    
    if new_role not in ["SUPER_ADMIN", "ADMIN", "USER"]:
        return jsonify({"message": "Invalid role"}), 400
    if not user_ids:
        return jsonify({"message": "No users specified"}), 400
        
    users = User.query.filter(User.id.in_(user_ids)).all()
    for u in users:
        u.role = new_role
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id="BULK_USERS",
        action="USER_BULK_ROLE_CHANGE",
        details=f"Updated {len(users)} users to role {new_role}"
    )
    
    return jsonify({"message": f"Successfully updated {len(users)} users"}), 200


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@jwt_required()
@role_required("SUPER_ADMIN")
def delete_user_account(user_id):
    """Permanently delete a user account."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.id == get_jwt_identity():
        return jsonify({"message": "You cannot delete your own account"}), 400
        
    db.session.delete(user)
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id=user_id,
        action="USER_DELETED",
        details=f"Admin deleted user: {user.email}"
    )
    
    return jsonify({"message": "User account permanently deleted"}), 200


# ── Content Management Endpoints ────────────────────────────────────────────

@admin_bp.route("/writings", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def list_writings():
    """List writings with search and status filter options."""
    search = request.args.get("search")
    content_type = request.args.get("content_type")
    is_deleted = request.args.get("is_deleted")
    
    query = Writing.query
    if search:
        query = query.filter(Writing.title.ilike(f"%{search}%"))
    if content_type:
        query = query.filter_by(content_type=content_type)
    if is_deleted is not None:
        is_del_bool = is_deleted.lower() == "true"
        query = query.filter_by(is_deleted=is_del_bool)
        
    writings = query.order_by(Writing.created_at.desc()).all()
    # Mask content for privacy, only return metadata
    return jsonify({"writings": [
        {
            "id": w.id,
            "user_id": w.user_id,
            "title": w.title,
            "content_type": w.content_type,
            "is_deleted": w.is_deleted,
            "deleted_at": w.deleted_at.isoformat() if w.deleted_at else None,
            "created_at": w.created_at.isoformat(),
            "word_count": w.word_count
        } for w in writings
    ]}), 200


@admin_bp.route("/writings/<writing_id>", methods=["DELETE"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def soft_delete_writing(writing_id):
    """Soft delete a writing."""
    w = Writing.query.get(writing_id)
    if not w:
        return jsonify({"message": "Writing not found"}), 404
        
    w.is_deleted = True
    w.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id=w.id,
        action="WRITING_SOFT_DELETE",
        details=f"Admin soft-deleted writing {w.id}"
    )
    
    return jsonify({"message": "Writing soft-deleted"}), 200


@admin_bp.route("/writings/<writing_id>/restore", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def restore_writing(writing_id):
    """Restore a soft-deleted writing."""
    w = Writing.query.get(writing_id)
    if not w:
        return jsonify({"message": "Writing not found"}), 404
        
    w.is_deleted = False
    w.deleted_at = None
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id=w.id,
        action="WRITING_RESTORE",
        details=f"Admin restored writing {w.id}"
    )
    
    return jsonify({"message": "Writing restored"}), 200


@admin_bp.route("/writings/bulk-delete", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def bulk_delete_writings():
    """Bulk soft-delete multiple writings."""
    data = request.get_json() or {}
    writing_ids = data.get("writing_ids", [])
    if not writing_ids:
        return jsonify({"message": "No writings specified"}), 400
        
    writings = Writing.query.filter(Writing.id.in_(writing_ids)).all()
    now = datetime.now(timezone.utc)
    for w in writings:
        w.is_deleted = True
        w.deleted_at = now
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id="BULK_WRITINGS",
        action="WRITING_BULK_DELETE",
        details=f"Soft-deleted {len(writings)} writings"
    )
    
    return jsonify({"message": f"Successfully deleted {len(writings)} writings"}), 200


@admin_bp.route("/writings/bulk-restore", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def bulk_restore_writings():
    """Bulk restore multiple writings."""
    data = request.get_json() or {}
    writing_ids = data.get("writing_ids", [])
    if not writing_ids:
        return jsonify({"message": "No writings specified"}), 400
        
    writings = Writing.query.filter(Writing.id.in_(writing_ids)).all()
    for w in writings:
        w.is_deleted = False
        w.deleted_at = None
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id="BULK_WRITINGS",
        action="WRITING_BULK_RESTORE",
        details=f"Restored {len(writings)} writings"
    )
    
    return jsonify({"message": f"Successfully restored {len(writings)} writings"}), 200


# ── Backup Management Endpoints ─────────────────────────────────────────────

@admin_bp.route("/backups", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN")
def list_backups():
    """List available sqlite database backup files."""
    backups_dir = os.path.join(current_app.root_path, "..", "backups")
    if not os.path.exists(backups_dir):
        os.makedirs(backups_dir)
        
    files = glob.glob(os.path.join(backups_dir, "*.db"))
    backups = []
    for f in files:
        stat = os.stat(f)
        backups.append({
            "filename": os.path.basename(f),
            "size_bytes": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        })
        
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify({"backups": backups}), 200


@admin_bp.route("/backups/create", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN")
def create_backup():
    """Trigger an atomic SQLite live backup using VACUUM INTO."""
    backups_dir = os.path.join(current_app.root_path, "..", "backups")
    if not os.path.exists(backups_dir):
        os.makedirs(backups_dir)
        
    backup_filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    backup_path = os.path.join(backups_dir, backup_filename)
    
    try:
        db.session.execute(text("VACUUM INTO :path"), {"path": backup_path})
        log_admin_action(
            admin_id=get_jwt_identity(),
            target_id=backup_filename,
            action="BACKUP_CREATED",
            details=f"Database backup created successfully: {backup_filename}"
        )
        return jsonify({"message": "Backup created successfully", "filename": backup_filename}), 201
    except Exception as e:
        return jsonify({"message": f"Failed to create backup: {str(e)}"}), 500


@admin_bp.route("/backups/download/<filename>", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN")
def download_backup(filename):
    """Download a backup file securely."""
    backups_dir = os.path.join(current_app.root_path, "..", "backups")
    if not os.path.exists(os.path.join(backups_dir, filename)):
        return jsonify({"message": "Backup file not found"}), 404
    return send_from_directory(backups_dir, filename, as_attachment=True)


@admin_bp.route("/backups/<filename>", methods=["DELETE"])
@jwt_required()
@role_required("SUPER_ADMIN")
def delete_backup(filename):
    """Delete a backup file."""
    backups_dir = os.path.join(current_app.root_path, "..", "backups")
    file_path = os.path.join(backups_dir, filename)
    if not os.path.exists(file_path):
        return jsonify({"message": "Backup file not found"}), 404
        
    os.remove(file_path)
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id=filename,
        action="BACKUP_DELETED",
        details=f"Database backup deleted: {filename}"
    )
    return jsonify({"message": "Backup file deleted successfully"}), 200


# ── Database Health Endpoint ────────────────────────────────────────────────

@admin_bp.route("/db-health", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN")
def get_db_health():
    """Retrieve SQLite specific database stats and row counts."""
    db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///app.db')
    db_size = 0
    if db_uri.startswith('sqlite:///'):
        db_file = db_uri.replace('sqlite:///', '')
        db_path = os.path.abspath(db_file)
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path)
            
    try:
        integrity = db.session.execute(text("PRAGMA integrity_check")).scalar()
        journal_mode = db.session.execute(text("PRAGMA journal_mode")).scalar()
        page_size = db.session.execute(text("PRAGMA page_size")).scalar()
        page_count = db.session.execute(text("PRAGMA page_count")).scalar()
    except Exception as e:
        integrity = f"error: {str(e)}"
        journal_mode = "unknown"
        page_size = 0
        page_count = 0
        
    row_counts = {
        "users": User.query.count(),
        "writings": Writing.query.count(),
        "categories": db.session.execute(text("SELECT COUNT(*) FROM categories")).scalar(),
        "tags": db.session.execute(text("SELECT COUNT(*) FROM tags")).scalar(),
        "share_links": ShareLink.query.count(),
        "audit_logs": AuditLog.query.count()
    }
    
    return jsonify({
        "db_size_bytes": db_size,
        "integrity_status": integrity,
        "journal_mode": journal_mode,
        "page_size": page_size,
        "page_count": page_count,
        "row_counts": row_counts
    }), 200


@admin_bp.route("/db-health/vacuum", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN")
def vacuum_db():
    """Run VACUUM command to rebuild database file and reclaim unused space."""
    try:
        db.session.execute(text("VACUUM"))
        log_admin_action(
            admin_id=get_jwt_identity(),
            target_id="DATABASE",
            action="DB_VACUUM",
            details="Database vacuum executed"
        )
        return jsonify({"message": "Database vacuum completed successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Vacuum failed: {str(e)}"}), 500


# ── Site Settings Endpoints ─────────────────────────────────────────────────

@admin_bp.route("/settings", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def get_settings():
    """Fetch global site settings, seeding defaults if missing."""
    settings = SiteSetting.query.all()
    defaults = {
        "allow_registration": "true",
        "maintenance_mode": "false",
        "system_notice": ""
    }
    db_settings = {s.key: s.value for s in settings}
    for k, v in defaults.items():
        if k not in db_settings:
            setting = SiteSetting(key=k, value=v)
            db.session.add(setting)
            db_settings[k] = v
    db.session.commit()
    return jsonify({"settings": db_settings}), 200


@admin_bp.route("/settings", methods=["POST"])
@jwt_required()
@role_required("SUPER_ADMIN")
def update_settings():
    """Update global site settings keys."""
    data = request.get_json() or {}
    for k, v in data.items():
        setting = SiteSetting.query.get(k)
        if setting:
            setting.value = str(v)
        else:
            setting = SiteSetting(key=k, value=str(v))
            db.session.add(setting)
    db.session.commit()
    
    log_admin_action(
        admin_id=get_jwt_identity(),
        target_id="SETTINGS",
        action="SETTINGS_CHANGE",
        details=f"Updated settings: {list(data.keys())}"
    )
    return jsonify({"message": "Settings updated successfully"}), 200


# ── Security Monitoring Endpoint ────────────────────────────────────────────

@admin_bp.route("/security/lockouts", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN")
def get_security_lockouts():
    """Fetch lockouts, link failures and failed login activity records."""
    locked_links = ShareLink.query.filter(
        (ShareLink.failed_attempts > 0) | (ShareLink.locked_until != None)
    ).all()
    
    links_list = []
    for link in locked_links:
        links_list.append({
            "id": link.id,
            "access_token": link.access_token,
            "writing_title": link.writing.title if link.writing else "Unknown",
            "failed_attempts": link.failed_attempts,
            "locked_until": link.locked_until.isoformat() if link.locked_until else None,
            "is_locked": link.is_brute_force_locked
        })
        
    failed_logins = AuditLog.query.filter(
        AuditLog.action.ilike("%login%failed%") | AuditLog.action.ilike("%unauthorized%")
    ).order_by(AuditLog.created_at.desc()).limit(20).all()
    
    return jsonify({
        "locked_share_links": links_list,
        "failed_login_attempts": [log.to_dict() for log in failed_logins]
    }), 200


# ── System Statistics Endpoint ──────────────────────────────────────────────

@admin_bp.route("/system-stats", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def get_system_stats():
    """Retrieve database timelines for user and content growth."""
    signup_rows = db.session.execute(text("""
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM users
        GROUP BY DATE(created_at)
        ORDER BY day ASC
        LIMIT 30
    """)).fetchall()
    
    writing_rows = db.session.execute(text("""
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM writings
        WHERE is_deleted = 0
        GROUP BY DATE(created_at)
        ORDER BY day ASC
        LIMIT 30
    """)).fetchall()
    
    category_breakdown = db.session.execute(text("""
        SELECT c.name, COUNT(w.id) AS count
        FROM categories c
        JOIN writings w ON w.category_id = c.id
        WHERE w.is_deleted = 0
        GROUP BY c.id, c.name
        ORDER BY count DESC
    """)).fetchall()
    
    return jsonify({
        "user_signups_timeline": [{"date": row.day, "count": row.count} for row in signup_rows],
        "writings_timeline": [{"date": row.day, "count": row.count} for row in writing_rows],
        "category_distribution": [{"category": row.name, "count": row.count} for row in category_breakdown]
    }), 200


# ── Original Statistics/Audit log fallback routes ───────────────────────────

@admin_bp.route("/statistics", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN", "ADMIN")
def get_statistics():
    user_count = User.query.count()
    writing_count = Writing.query.count()
    share_count = ShareLink.query.count()
    return jsonify({
        "total_users": user_count,
        "total_writings": writing_count,
        "total_share_links": share_count
    }), 200


@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
@role_required("SUPER_ADMIN")
def get_audit_logs():
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(100).all()
    return jsonify({"audit_logs": [log.to_dict() for log in logs]}), 200
