from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from app.extensions import db
from app.models.tag import Tag
from app.schemas.tag import TagSchema
from app.utils.helpers import slugify

tags_bp = Blueprint("tags", __name__)
tag_schema = TagSchema()
tags_schema = TagSchema(many=True)

@tags_bp.route("", methods=["GET"])
@jwt_required()
def get_tags():
    user_id = get_jwt_identity()
    tags = Tag.query.filter_by(user_id=user_id).order_by(Tag.name.asc()).all()
    return jsonify(tags_schema.dump(tags)), 200

@tags_bp.route("", methods=["POST"])
@jwt_required()
def create_tag():
    user_id = get_jwt_identity()
    try:
        data = tag_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400

    name = data["name"].strip()
    slug = slugify(name)

    existing = Tag.query.filter_by(user_id=user_id, slug=slug).first()
    if existing:
        return jsonify({"message": f"Tag with name or slug '{name}' already exists"}), 409

    tag = Tag(user_id=user_id, name=name, slug=slug)
    db.session.add(tag)
    db.session.commit()

    return jsonify(tag_schema.dump(tag)), 201

@tags_bp.route("/<tag_id>", methods=["GET"])
@jwt_required()
def get_tag(tag_id):
    user_id = get_jwt_identity()
    tag = Tag.query.filter_by(id=tag_id, user_id=user_id).first()
    if not tag:
        return jsonify({"message": "Tag not found"}), 404
    return jsonify(tag_schema.dump(tag)), 200

@tags_bp.route("/<tag_id>", methods=["PUT"])
@jwt_required()
def update_tag(tag_id):
    user_id = get_jwt_identity()
    tag = Tag.query.filter_by(id=tag_id, user_id=user_id).first()
    if not tag:
        return jsonify({"message": "Tag not found"}), 404

    try:
        data = tag_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400

    name = data["name"].strip()
    slug = slugify(name)

    existing = Tag.query.filter(
        Tag.user_id == user_id,
        Tag.slug == slug,
        Tag.id != tag.id
    ).first()
    if existing:
        return jsonify({"message": f"Another tag with name or slug '{name}' already exists"}), 409

    tag.name = name
    tag.slug = slug
    db.session.commit()

    return jsonify(tag_schema.dump(tag)), 200

@tags_bp.route("/<tag_id>", methods=["DELETE"])
@jwt_required()
def delete_tag(tag_id):
    user_id = get_jwt_identity()
    tag = Tag.query.filter_by(id=tag_id, user_id=user_id).first()
    if not tag:
        return jsonify({"message": "Tag not found"}), 404

    db.session.delete(tag)
    db.session.commit()
    return jsonify({"message": "Tag deleted successfully"}), 200
