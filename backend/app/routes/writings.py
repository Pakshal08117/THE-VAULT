from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
import io
import re
from sqlalchemy import case

from app.extensions import db
from app.models.writing import Writing
from app.models.category import Category
from app.models.tag import Tag
from app.models.share_link import ShareLink, VALID_SHARE_MODES
from app.schemas.writing import WritingSchema
from app.services.pdf_service import generate_writing_pdf, generate_collection_pdf
from app.utils.helpers import slugify, sanitize_html

writings_bp = Blueprint("writings", __name__)
writing_schema = WritingSchema()


# ── GET /writings/shares — all active share links for this user ───────────────
@writings_bp.route("/shares", methods=["GET"])
@jwt_required()
def list_share_links():
    """Return all active share links for the authenticated user, enriched with writing title."""
    user_id = get_jwt_identity()
    links = (
        ShareLink.query
        .join(Writing, ShareLink.writing_id == Writing.id)
        .filter(Writing.user_id == user_id, ShareLink.is_active == True)
        .order_by(ShareLink.created_at.desc())
        .all()
    )
    result = []
    for link in links:
        d = link.to_dict()
        d["writing_title"] = link.writing.title
        result.append(d)
    return jsonify(result), 200

@writings_bp.route("", methods=["GET"])
@jwt_required()
def get_writings():
    user_id = get_jwt_identity()
    
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
    except ValueError:
        page = 1
        per_page = 20
        
    query_str = request.args.get("q", "").strip()
    category_slug = request.args.get("category", "").strip()
    tag_slug = request.args.get("tag", "").strip()
    content_type = request.args.get("content_type", "").strip()
    is_favorite = request.args.get("is_favorite", "").strip()
    is_archived = request.args.get("is_archived", "false").strip()
    sort_by = request.args.get("sort_by", "relevance" if query_str else "created_at").strip()
    order = request.args.get("order", "desc").strip()
    
    # Advanced filters
    start_date_str = request.args.get("start_date", "").strip()
    end_date_str = request.args.get("end_date", "").strip()
    title_q = request.args.get("title", "").strip()
    
    query = Writing.query.filter(Writing.user_id == user_id)
    
    fts_map = {}
    if query_str:
        # SQLite FTS5 prefix/wildcard match logic
        words = re.findall(r"\w+", query_str)
        clean_q = " ".join([f"{w}*" for w in words])
        
        if clean_q:
            try:
                fts_query = db.session.execute(
                    db.text("SELECT writing_id, bm25(writings_fts) AS rank FROM writings_fts WHERE writings_fts MATCH :q"),
                    {"q": clean_q}
                ).fetchall()
                fts_map = {row[0]: row[1] for row in fts_query}
            except Exception:
                # Fallback to standard ILIKE if FTS fails (e.g. non-sqlite or table missing)
                fts_map = {}
                
            if fts_map:
                query = query.filter(Writing.id.in_(fts_map.keys()))
            else:
                if "sqlite" in str(db.engine.url):
                    # No matches in FTS
                    return jsonify({
                        "items": [],
                        "total": 0,
                        "page": page,
                        "pages": 0,
                        "per_page": per_page
                    }), 200
                else:
                    # Fallback database fallback ILIKE search for non-sqlite
                    query = query.filter(
                        Writing.title.ilike(f"%{query_str}%") | 
                        Writing.content.ilike(f"%{query_str}%")
                    )
        
    if category_slug:
        query = query.join(Writing.category).filter(Category.slug == category_slug)
        
    if tag_slug:
        query = query.join(Writing.tags).filter(Tag.slug == tag_slug)
        
    if content_type:
        query = query.filter(Writing.content_type == content_type.upper())
        
    if is_favorite.lower() == "true":
        query = query.filter(Writing.is_favorite == True)
    elif is_favorite.lower() == "false":
        query = query.filter(Writing.is_favorite == False)
        
    if is_archived.lower() == "true":
        query = query.filter(Writing.is_archived == True)
    elif is_archived.lower() == "false":
        query = query.filter(Writing.is_archived == False)
        
    if start_date_str:
        try:
            clean_start = start_date_str.replace("Z", "+00:00")
            clean_start = re.sub(r'\s(\d{2}:?\d{2})$', r'+\1', clean_start)
            start_date = datetime.fromisoformat(clean_start)
            if start_date.tzinfo is not None:
                start_date_naive = start_date.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                start_date_naive = start_date
            query = query.filter(Writing.created_at >= start_date_naive)
        except ValueError:
            pass
            
    if end_date_str:
        try:
            clean_end = end_date_str.replace("Z", "+00:00")
            clean_end = re.sub(r'\s(\d{2}:?\d{2})$', r'+\1', clean_end)
            end_date = datetime.fromisoformat(clean_end)
            if end_date.tzinfo is not None:
                end_date_naive = end_date.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                end_date_naive = end_date
            query = query.filter(Writing.created_at <= end_date_naive)
        except ValueError:
            pass
            
    if title_q:
        query = query.filter(Writing.title.ilike(f"%{title_q}%"))
    
    # Sorting & Ranking
    if query_str and sort_by == "relevance" and fts_map:
        w_ids = list(fts_map.keys())
        ordering = case(
            {w_id: fts_map[w_id] for w_id in w_ids},
            value=Writing.id
        )
        query = query.order_by(ordering.asc())
    else:
        sort_field = Writing.created_at
        if sort_by == "updated_at":
            sort_field = Writing.updated_at
        elif sort_by == "title":
            sort_field = Writing.title
            
        if order == "asc":
            query = query.order_by(sort_field.asc())
        else:
            query = query.order_by(sort_field.desc())
        
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "items": [item.to_dict() for item in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": pagination.per_page
    }), 200

@writings_bp.route("", methods=["POST"])
@jwt_required()
def create_writing():
    user_id = get_jwt_identity()
    try:
        data = writing_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400
        
    category_id = data.get("category_id")
    if category_id:
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        if not category:
            return jsonify({"message": "Category not found or does not belong to you"}), 400
            
    tag_objects = []
    for tag_name in data.get("tags", []):
        tag_name_clean = tag_name.strip()
        if not tag_name_clean:
            continue
        tag_slug = slugify(tag_name_clean)
        tag = Tag.query.filter_by(user_id=user_id, slug=tag_slug).first()
        if not tag:
            tag = Tag(user_id=user_id, name=tag_name_clean, slug=tag_slug)
            db.session.add(tag)
        tag_objects.append(tag)
        
    writing = Writing(
        user_id=user_id,
        category_id=category_id,
        title=data["title"].strip(),
        content=sanitize_html(data["content"]),
        content_type=data["content_type"].upper(),
        is_favorite=data.get("is_favorite", False),
        is_archived=data.get("is_archived", False)
    )
    writing.tags = tag_objects
    
    db.session.add(writing)
    db.session.commit()
    
    return jsonify(writing.to_dict()), 201

@writings_bp.route("/<writing_id>", methods=["GET"])
@jwt_required()
def get_writing(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
    return jsonify(writing.to_dict()), 200

@writings_bp.route("/<writing_id>", methods=["PUT"])
@jwt_required()
def update_writing(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
        
    try:
        data = writing_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400
        
    category_id = data.get("category_id")
    if category_id:
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        if not category:
            return jsonify({"message": "Category not found or does not belong to you"}), 400
            
    tag_objects = []
    for tag_name in data.get("tags", []):
        tag_name_clean = tag_name.strip()
        if not tag_name_clean:
            continue
        tag_slug = slugify(tag_name_clean)
        tag = Tag.query.filter_by(user_id=user_id, slug=tag_slug).first()
        if not tag:
            tag = Tag(user_id=user_id, name=tag_name_clean, slug=tag_slug)
            db.session.add(tag)
        tag_objects.append(tag)
        
    writing.title = data["title"].strip()
    writing.content = sanitize_html(data["content"])
    writing.content_type = data["content_type"].upper()
    writing.category_id = category_id
    writing.is_favorite = data.get("is_favorite", writing.is_favorite)
    writing.is_archived = data.get("is_archived", writing.is_archived)
    writing.tags = tag_objects
    
    db.session.commit()
    
    return jsonify(writing.to_dict()), 200

@writings_bp.route("/<writing_id>", methods=["DELETE"])
@jwt_required()
def delete_writing(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
        
    db.session.delete(writing)
    db.session.commit()
    return jsonify({"message": "Writing deleted successfully"}), 200

@writings_bp.route("/<writing_id>/favorite", methods=["PATCH"])
@jwt_required()
def toggle_favorite(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
        
    writing.is_favorite = not writing.is_favorite
    db.session.commit()
    return jsonify({
        "message": f"Writing {'marked as favorite' if writing.is_favorite else 'removed from favorites'}",
        "is_favorite": writing.is_favorite
    }), 200

@writings_bp.route("/<writing_id>/archive", methods=["PATCH"])
@jwt_required()
def toggle_archive(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
        
    writing.is_archived = not writing.is_archived
    db.session.commit()
    return jsonify({
        "message": f"Writing {'archived' if writing.is_archived else 'unarchived'}",
        "is_archived": writing.is_archived
    }), 200

@writings_bp.route("/<writing_id>/share", methods=["GET"])
@jwt_required()
def get_share_link(writing_id):
    """Get current active share link for a writing."""
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404

    share_link = ShareLink.query.filter_by(writing_id=writing.id, is_active=True).first()
    if not share_link:
        return jsonify({"message": "No active share link"}), 404
    return jsonify(share_link.to_dict()), 200


@writings_bp.route("/<writing_id>/share", methods=["POST"])
@jwt_required()
def generate_share_link(writing_id):
    """Create or update a share link for a writing."""
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404

    req_data = request.get_json() or {}
    passcode        = req_data.get("passcode")
    expires_in_hours = req_data.get("expires_in_hours")
    share_mode      = req_data.get("share_mode", "public")
    max_views       = req_data.get("max_views")

    # Validate share_mode
    if share_mode not in VALID_SHARE_MODES:
        return jsonify({"message": f"Invalid share_mode. Must be one of: {', '.join(VALID_SHARE_MODES)}"}), 400

    expires_at = None
    if expires_in_hours is not None:
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=float(expires_in_hours))
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid value for expires_in_hours"}), 400

    if max_views is not None:
        try:
            max_views = int(max_views)
            if max_views < 1:
                return jsonify({"message": "max_views must be at least 1"}), 400
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid value for max_views"}), 400

    # Revoke existing link and create fresh one (new token on update)
    existing = ShareLink.query.filter_by(writing_id=writing.id, is_active=True).first()
    if existing:
        existing.is_active = False

    share_link = ShareLink(
        writing_id=writing.id,
        share_mode=share_mode,
        max_views=max_views,
    )
    share_link.set_passcode(passcode)
    share_link.expires_at = expires_at
    db.session.add(share_link)
    db.session.commit()

    return jsonify(share_link.to_dict()), 200

@writings_bp.route("/<writing_id>/share", methods=["DELETE"])
@jwt_required()
def delete_share_link(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
        
    share_link = ShareLink.query.filter_by(writing_id=writing.id).first()
    if share_link:
        db.session.delete(share_link)
        db.session.commit()
        
    return jsonify({"message": "Share link revoked successfully"}), 200

@writings_bp.route("/<writing_id>/export", methods=["GET"])
@jwt_required()
def export_writing(writing_id):
    user_id = get_jwt_identity()
    writing = Writing.query.filter_by(id=writing_id, user_id=user_id).first()
    if not writing:
        return jsonify({"message": "Writing not found"}), 404
        
    try:
        pdf_bytes = generate_writing_pdf(writing)
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        safe_filename = f"{slugify(writing.title) or 'writing'}.pdf"
        return send_file(
            buffer,
            as_attachment=True,
            download_name=safe_filename,
            mimetype="application/pdf"
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate PDF", "error": str(e)}), 500

@writings_bp.route("/export-collection", methods=["POST"])
@jwt_required()
def export_collection():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = data.get("title", "The Vault Collection")
    writing_ids = data.get("writing_ids", [])
    
    query = Writing.query.filter_by(user_id=user_id, is_archived=False)
    if writing_ids:
        query = query.filter(Writing.id.in_(writing_ids))
        
    writings = query.order_by(Writing.created_at.asc()).all()
    if not writings:
        return jsonify({"message": "No writings found to export"}), 404
        
    try:
        pdf_bytes = generate_collection_pdf(title, writings)
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        safe_filename = f"{slugify(title) or 'collection'}.pdf"
        return send_file(
            buffer,
            as_attachment=True,
            download_name=safe_filename,
            mimetype="application/pdf"
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate PDF", "error": str(e)}), 500
