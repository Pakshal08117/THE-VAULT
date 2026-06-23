from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
import io

from app.extensions import db
from app.models.category import Category
from app.models.writing import Writing
from app.schemas.category import CategorySchema
from app.services.pdf_service import generate_category_pdf
from app.utils.helpers import slugify

categories_bp = Blueprint("categories", __name__)
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

@categories_bp.route("", methods=["GET"])
@jwt_required()
def get_categories():
    user_id = get_jwt_identity()
    categories = Category.query.filter_by(user_id=user_id).order_by(Category.name.asc()).all()
    return jsonify(categories_schema.dump(categories)), 200

@categories_bp.route("", methods=["POST"])
@jwt_required()
def create_category():
    user_id = get_jwt_identity()
    try:
        data = category_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400

    name = data["name"].strip()
    slug = slugify(name)
    color_hex = data.get("color_hex", "#d4af37")

    existing = Category.query.filter_by(user_id=user_id, slug=slug).first()
    if existing:
        return jsonify({"message": f"Category with name or slug '{name}' already exists"}), 409

    category = Category(
        user_id=user_id,
        name=name,
        slug=slug,
        color_hex=color_hex
    )
    db.session.add(category)
    db.session.commit()

    return jsonify(category_schema.dump(category)), 201

@categories_bp.route("/<category_id>", methods=["GET"])
@jwt_required()
def get_category(category_id):
    user_id = get_jwt_identity()
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return jsonify({"message": "Category not found"}), 404
    return jsonify(category_schema.dump(category)), 200

@categories_bp.route("/<category_id>", methods=["PUT"])
@jwt_required()
def update_category(category_id):
    user_id = get_jwt_identity()
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return jsonify({"message": "Category not found"}), 404

    try:
        data = category_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400

    name = data["name"].strip()
    slug = slugify(name)

    existing = Category.query.filter(
        Category.user_id == user_id,
        Category.slug == slug,
        Category.id != category.id
    ).first()
    if existing:
        return jsonify({"message": f"Another category with name or slug '{name}' already exists"}), 409

    category.name = name
    category.slug = slug
    category.color_hex = data.get("color_hex", category.color_hex)
    db.session.commit()

    return jsonify(category_schema.dump(category)), 200

@categories_bp.route("/<category_id>", methods=["DELETE"])
@jwt_required()
def delete_category(category_id):
    user_id = get_jwt_identity()
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return jsonify({"message": "Category not found"}), 404

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200

@categories_bp.route("/<category_id>/export", methods=["GET"])
@jwt_required()
def export_category(category_id):
    user_id = get_jwt_identity()
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return jsonify({"message": "Category not found"}), 404
        
    writings = Writing.query.filter_by(user_id=user_id, category_id=category_id, is_archived=False).order_by(Writing.created_at.asc()).all()
    if not writings:
        return jsonify({"message": "No writings found in this category to export"}), 404
        
    try:
        pdf_bytes = generate_category_pdf(category, writings)
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        safe_filename = f"category-{slugify(category.name) or 'archive'}.pdf"
        return send_file(
            buffer,
            as_attachment=True,
            download_name=safe_filename,
            mimetype="application/pdf"
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate PDF", "error": str(e)}), 500
