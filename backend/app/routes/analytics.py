"""
Analytics Blueprint — Live Database Analytics for The Vault Dashboard.

All metrics are derived directly from raw SQL aggregations for maximum performance.
Every query is scoped strictly by user_id for complete data isolation.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from sqlalchemy import text

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_summary():
    """
    Returns all core user dashboard metrics in a single efficient DB round-trip.
    Metrics: total writings, favorites, words, categories, tags, and most-used content types.
    """
    user_id = get_jwt_identity()

    summary = db.session.execute(text("""
        SELECT
            COUNT(*)                                              AS total_writings,
            COALESCE(SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END), 0)  AS total_favorites,
            COALESCE(SUM(word_count), 0)                         AS total_words,
            COALESCE(SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END), 0)  AS total_archived,
            COALESCE(SUM(CASE WHEN is_deleted  = 1 THEN 1 ELSE 0 END), 0)  AS total_deleted
        FROM writings
        WHERE user_id = :uid
    """), {"uid": user_id}).fetchone()

    cat_count = db.session.execute(text("""
        SELECT COUNT(*) FROM categories WHERE user_id = :uid
    """), {"uid": user_id}).scalar()

    tag_count = db.session.execute(text("""
        SELECT COUNT(*) FROM tags WHERE user_id = :uid
    """), {"uid": user_id}).scalar()

    user_count = db.session.execute(text("""
        SELECT COUNT(*) FROM users
    """)).scalar()

    type_breakdown = db.session.execute(text("""
        SELECT content_type, COUNT(*) AS cnt
        FROM writings
        WHERE user_id = :uid AND is_archived = 0 AND is_deleted = 0
        GROUP BY content_type
        ORDER BY cnt DESC
    """), {"uid": user_id}).fetchall()

    return jsonify({
        "total_writings":  summary.total_writings,
        "total_favorites": summary.total_favorites,
        "total_words":     summary.total_words,
        "total_archived":  summary.total_archived,
        "total_deleted":   summary.total_deleted,
        "total_categories": cat_count or 0,
        "total_tags":      tag_count or 0,
        "total_users":     user_count or 0,
        "type_breakdown":  [{"type": row.content_type, "count": row.cnt} for row in type_breakdown],
    }), 200



@analytics_bp.route("/activity/daily", methods=["GET"])
@jwt_required()
def get_daily_activity():
    """
    Returns writings created per day for the past 30 days.
    Used to render the activity heatmap / bar chart on the dashboard.
    """
    user_id = get_jwt_identity()

    rows = db.session.execute(text("""
        SELECT
            DATE(created_at) AS day,
            COUNT(*)          AS count
        FROM writings
        WHERE user_id  = :uid
          AND is_deleted = 0
          AND DATE(created_at) >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY day ASC
    """), {"uid": user_id}).fetchall()

    return jsonify({
        "daily_activity": [{"date": row.day, "count": row.count} for row in rows]
    }), 200


@analytics_bp.route("/activity/monthly", methods=["GET"])
@jwt_required()
def get_monthly_activity():
    """
    Returns writings created per month for the past 12 months.
    """
    user_id = get_jwt_identity()

    rows = db.session.execute(text("""
        SELECT
            strftime('%Y-%m', created_at) AS month,
            COUNT(*)                       AS count
        FROM writings
        WHERE user_id  = :uid
          AND is_deleted = 0
          AND DATE(created_at) >= DATE('now', '-365 days')
        GROUP BY month
        ORDER BY month ASC
    """), {"uid": user_id}).fetchall()

    return jsonify({
        "monthly_activity": [{"month": row.month, "count": row.count} for row in rows]
    }), 200


@analytics_bp.route("/tags/top", methods=["GET"])
@jwt_required()
def get_top_tags():
    """
    Returns the top 10 most-used tags across the user's writings.
    Uses a JOIN across the writing_tags association table.
    """
    user_id = get_jwt_identity()

    rows = db.session.execute(text("""
        SELECT
            t.name,
            COUNT(wt.writing_id) AS usage_count
        FROM tags t
        JOIN writing_tags wt ON wt.tag_id = t.id
        JOIN writings w       ON w.id = wt.writing_id
        WHERE t.user_id  = :uid
          AND w.is_deleted = 0
        GROUP BY t.id, t.name
        ORDER BY usage_count DESC
        LIMIT 10
    """), {"uid": user_id}).fetchall()

    return jsonify({
        "top_tags": [{"name": row.name, "count": row.usage_count} for row in rows]
    }), 200


@analytics_bp.route("/writings/recent", methods=["GET"])
@jwt_required()
def get_recent_writings():
    """
    Returns the 5 most recently created non-archived, non-deleted writings.
    Used for the "Recent Activity" panel on the dashboard.
    """
    user_id = get_jwt_identity()

    rows = db.session.execute(text("""
        SELECT id, title, content_type, word_count, created_at
        FROM writings
        WHERE user_id   = :uid
          AND is_archived = 0
          AND is_deleted  = 0
        ORDER BY created_at DESC
        LIMIT 5
    """), {"uid": user_id}).fetchall()

    return jsonify({
        "recent_writings": [
            {
                "id":           row.id,
                "title":        row.title,
                "content_type": row.content_type,
                "word_count":   row.word_count,
                "created_at":   row.created_at,
            }
            for row in rows
        ]
    }), 200


@analytics_bp.route("/writings/most-viewed", methods=["GET"])
@jwt_required()
def get_most_viewed_writings():
    """
    Returns the top 5 most viewed writings based on aggregate view counts of their share links.
    """
    user_id = get_jwt_identity()

    rows = db.session.execute(text("""
        SELECT w.id, w.title, w.content_type, COALESCE(SUM(s.view_count), 0) AS total_views
        FROM writings w
        LEFT JOIN share_links s ON w.id = s.writing_id
        WHERE w.user_id = :uid
          AND w.is_deleted = 0
        GROUP BY w.id, w.title, w.content_type
        ORDER BY total_views DESC, w.created_at DESC
        LIMIT 5
    """), {"uid": user_id}).fetchall()

    return jsonify({
        "most_viewed_writings": [
            {
                "id":           row.id,
                "title":        row.title,
                "content_type": row.content_type,
                "views":        row.total_views,
            }
            for row in rows
        ]
    }), 200

