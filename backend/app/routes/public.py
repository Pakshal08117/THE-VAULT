"""
Public sharing routes — unauthenticated endpoints for reading shared writings.

Security controls implemented:
  - Brute-force protection: MAX_FAILED_ATTEMPTS wrong passcodes → 15-min lockout
  - Expiry enforcement: server-side UTC check on every request
  - Max-views enforcement: atomic increment + auto-revoke when limit reached
  - View tracking: last_viewed_at updated on every successful read
  - Token opacity: UUIDs used as tokens, internal IDs never exposed
  - X-Robots-Tag: noindex header prevents search engine indexing of shared content
  - Audit logging: share access, failed passcode attempts logged for security review
"""
import logging
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.share_link import ShareLink, MAX_FAILED_ATTEMPTS

logger = logging.getLogger(__name__)
public_bp = Blueprint("public", __name__)


def _noindex_headers() -> dict:
    """Prevent search engines from indexing shared content."""
    return {"X-Robots-Tag": "noindex, nofollow"}


def _get_public_writing_payload(share_link: ShareLink) -> dict:
    """Build the public reading payload from an unlocked share link."""
    writing = share_link.writing
    return {
        "title":         writing.title,
        "content":       writing.content,
        "content_type":  writing.content_type,
        "created_at":    writing.created_at.isoformat(),
        "category_name": writing.category.name if writing.category else None,
        "tags":          [tag.name for tag in writing.tags],
        "share_mode":    share_link.share_mode,
        "expires_at":    share_link.expires_at.isoformat() if share_link.expires_at else None,
        "view_count":    share_link.view_count,
        "max_views":     share_link.max_views,
        "views_remaining": share_link.views_remaining,
        "is_view_exhausted": share_link.is_view_exhausted,
    }


def _resolve_link(token: str):
    """
    Lookup a share link by token. Returns (share_link, error_response).
    error_response is None on success.
    """
    share_link = ShareLink.query.filter_by(access_token=token, is_active=True).first()
    if not share_link:
        return None, (jsonify({"message": "Shared writing not found or link has been revoked"}), 404)

    if share_link.is_expired:
        logger.info(f"Share link expired: token={token[:8]}...")
        return None, (jsonify({"message": "This share link has expired", "error": "expired"}), 410)

    if share_link.is_view_exhausted:
        logger.info(f"Share link view-exhausted: token={token[:8]}...")
        return None, (jsonify({"message": "This link has reached its maximum view limit", "error": "view_limit_reached"}), 410)

    return share_link, None


# ── GET /share/<token>/meta ───────────────────────────────────────────────────
@public_bp.route("/share/<token>/meta", methods=["GET"])
def get_share_meta(token):
    """
    Pre-flight metadata — returns share mode, expiry, passcode requirement
    WITHOUT unlocking content. Used by the frontend to render the correct UI
    before the user submits a passcode.
    """
    share_link, err = _resolve_link(token)
    if err:
        return err[0], err[1], _noindex_headers()

    return jsonify({
        "share_mode":       share_link.share_mode,
        "has_passcode":     share_link.passcode_hash is not None,
        "expires_at":       share_link.expires_at.isoformat() if share_link.expires_at else None,
        "max_views":        share_link.max_views,
        "views_remaining":  share_link.views_remaining,
        "view_count":       share_link.view_count,
        "is_locked":        share_link.is_brute_force_locked,
        "lockout_seconds":  share_link.lockout_seconds_remaining,
        "failed_attempts":  share_link.failed_attempts,
    }), 200, _noindex_headers()


# ── GET /share/<token> ────────────────────────────────────────────────────────
@public_bp.route("/share/<token>", methods=["GET"])
def get_shared_writing(token):
    """
    Read a shared writing. If passcode-protected, returns 403 with passcode_required=True
    so the frontend can show the unlock gate instead.
    """
    share_link, err = _resolve_link(token)
    if err:
        return err[0], err[1], _noindex_headers()

    # Passcode gate — send back metadata so frontend renders lock UI
    if share_link.passcode_hash:
        if share_link.is_brute_force_locked:
            return jsonify({
                "message":        "Too many failed attempts. Try again later.",
                "error":          "brute_force_locked",
                "lockout_seconds": share_link.lockout_seconds_remaining,
            }), 429, _noindex_headers()

        passcode = request.args.get("passcode")
        if not passcode or not share_link.check_passcode(passcode):
            db.session.commit()
            logger.warning(f"Audit — Share passcode_required: token={token[:8]}...")
            return jsonify({
                "message":          "Passcode required",
                "passcode_required": True,
                "share_mode":       share_link.share_mode,
                "expires_at":       share_link.expires_at.isoformat() if share_link.expires_at else None,
                "is_locked":        share_link.is_brute_force_locked,
                "lockout_seconds":  share_link.lockout_seconds_remaining,
                "failed_attempts":  share_link.failed_attempts,
            }), 403, _noindex_headers()

    share_link.record_view()
    db.session.commit()

    logger.info(f"Audit — Share accessed: token={token[:8]}... views={share_link.view_count}")
    return jsonify(_get_public_writing_payload(share_link)), 200, _noindex_headers()


# ── POST /share/<token>/unlock ────────────────────────────────────────────────
@public_bp.route("/share/<token>/unlock", methods=["POST"])
def unlock_shared_writing(token):
    """
    Submit passcode to unlock a protected share link.
    Implements brute-force protection: 5 wrong attempts → 15-min lockout.
    """
    share_link, err = _resolve_link(token)
    if err:
        return err[0], err[1], _noindex_headers()

    # Check lockout before processing any passcode
    if share_link.is_brute_force_locked:
        logger.warning(f"Audit — Share unlock blocked (locked): token={token[:8]}...")
        return jsonify({
            "message":         "Too many failed attempts. Please wait before trying again.",
            "error":           "brute_force_locked",
            "lockout_seconds": share_link.lockout_seconds_remaining,
        }), 429, _noindex_headers()

    req_data = request.get_json() or {}
    passcode = req_data.get("passcode", "")

    if not share_link.check_passcode(passcode):
        db.session.commit()
        logger.warning(
            f"Audit — Share passcode failed: token={token[:8]}... "
            f"attempts={share_link.failed_attempts} locked={share_link.is_brute_force_locked}"
        )
        response_body = {
            "message":         "Incorrect passcode",
            "failed_attempts": share_link.failed_attempts,
        }
        if share_link.is_brute_force_locked:
            response_body["lockout_seconds"] = share_link.lockout_seconds_remaining
            response_body["error"] = "brute_force_locked"
            return jsonify(response_body), 429, _noindex_headers()
        else:
            attempts_left = MAX_FAILED_ATTEMPTS - share_link.failed_attempts
            response_body["attempts_remaining"] = max(0, attempts_left)
            return jsonify(response_body), 401, _noindex_headers()

    # Passcode correct — record view
    share_link.record_view()
    db.session.commit()

    logger.info(f"Audit — Share unlocked successfully: token={token[:8]}... views={share_link.view_count}")
    return jsonify(_get_public_writing_payload(share_link)), 200, _noindex_headers()
