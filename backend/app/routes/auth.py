from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    get_jwt,
    jwt_required
)
from marshmallow import ValidationError

from app.extensions import db, limiter
from app.models.user import User
from app.models.token_block import TokenBlock
from app.schemas.auth import (
    RegisterSchema,
    LoginSchema,
    PasswordResetRequestSchema,
    PasswordResetConfirmSchema
)

auth_bp = Blueprint("auth", __name__)

register_schema = RegisterSchema()
login_schema = LoginSchema()
reset_request_schema = PasswordResetRequestSchema()
reset_confirm_schema = PasswordResetConfirmSchema()

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    try:
        data = register_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400

    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        current_app.logger.warning(f"Audit Log - Registration attempt failed: email '{email}' already registered.")
        return jsonify({"message": "Email already registered"}), 409

    # Create user manually and set password
    user = User(email=email, password_hash="", display_name=data.get("display_name"))
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=user.id)

    current_app.logger.info(f"Audit Log - Registration successful: email '{email}', ID '{user.id}'")
    return jsonify({
        "message": "User registered successfully",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    try:
        data = login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"message": "Validation error", "errors": err.messages}), 400

    email = data["email"].strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(data["password"]):
        current_app.logger.warning(f"Audit Log - Login attempt failed: email '{email}'")
        return jsonify({"message": "Invalid email or password"}), 401

    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=user.id)

    current_app.logger.info(f"Audit Log - Login successful: email '{email}', ID '{user.id}'")
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user.to_dict()), 200

@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    data = request.get_json() or {}
    if "display_name" in data:
        user.display_name = data["display_name"]
        
    db.session.commit()
    
    # Update token if needed, or just return updated user
    return jsonify({
        "message": "Profile updated successfully",
        "user": user.to_dict()
    }), 200

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
         return jsonify({"message": "User not found"}), 404
    new_access_token = create_access_token(identity=identity, additional_claims={"role": user.role})
    return jsonify({"access_token": new_access_token}), 200

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    token_block = TokenBlock(jti=jti)
    db.session.add(token_block)
    db.session.commit()
    return jsonify({"message": "Logged out successfully"}), 200

@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5 per minute")
def request_password_reset():
    json_data = request.get_json() or {}
    if "token" in json_data:
        try:
            data = reset_confirm_schema.load(json_data)
        except ValidationError as err:
            return jsonify({"message": "Validation error", "errors": err.messages}), 400
        
        from flask_jwt_extended import decode_token
        try:
            decoded = decode_token(data["token"])
            if decoded.get("type") != "reset":
                return jsonify({"message": "Invalid token type"}), 400
            user_id = decoded["sub"]
        except Exception:
            return jsonify({"message": "Invalid or expired reset token"}), 400
            
        user = User.query.get(user_id)
        if not user:
            current_app.logger.warning(f"Audit Log - Password reset failed: user ID '{user_id}' not found.")
            return jsonify({"message": "User not found"}), 404
            
        user.set_password(data["new_password"])
        db.session.commit()
        current_app.logger.info(f"Audit Log - Password reset confirmation successful: user ID '{user.id}'")
        return jsonify({"message": "Password updated successfully"}), 200
        
    else:
        try:
            data = reset_request_schema.load(json_data)
        except ValidationError as err:
            return jsonify({"message": "Validation error", "errors": err.messages}), 400
            
        email = data["email"].strip().lower()
        user = User.query.filter_by(email=email).first()
        
        if not user:
            current_app.logger.warning(f"Audit Log - Password reset requested for unregistered email: email '{email}'")
            return jsonify({
                "message": "If the email exists, a reset token has been generated",
                "token": "mock-token-not-found"
            }), 200
            
        from datetime import timedelta
        reset_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(minutes=15),
            additional_claims={"type": "reset"}
        )
        
        current_app.logger.info(f"Audit Log - Password reset request generated: email '{email}', ID '{user.id}'")
        return jsonify({
            "message": "Reset token generated successfully",
            "token": reset_token
        }), 200
