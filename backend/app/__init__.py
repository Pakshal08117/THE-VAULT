"""
The Vault — Application Factory.

Configures Flask extensions, SQLAlchemy engine events (WAL + FK pragmas),
Alembic migrations via Flask-Migrate, security headers, and error handlers.
"""

import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify
from flask_limiter.errors import RateLimitExceeded
from sqlalchemy import event

from config import config_by_name
from app.extensions import db, jwt, limiter, cors, talisman, migrate
from app.routes import auth_bp, writings_bp, categories_bp, tags_bp, public_bp, analytics_bp


def create_app(config_name=None):
    """Application factory to create and configure the Flask app instance."""
    app = Flask(__name__)

    # Load configuration
    if not config_name:
        config_name = os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_by_name[config_name])

    # Hardening against proxy IP spoofing / rate-limit bypasses
    if config_name == "production":
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    # Configure logging
    setup_logging(app)

    # ── Initialize Extensions ────────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)      # Flask-Migrate (Alembic wrapper)
    limiter.init_app(app)

    # Initialize CORS
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=app.config.get("CORS_SUPPORTS_CREDENTIALS", True)
    )

    # Initialize Talisman (secure headers)
    if app.config.get("TALISMAN_ENABLED", True):
        talisman.init_app(
            app,
            force_https=True,
            strict_transport_security=True,
            session_cookie_secure=True,
            content_security_policy={
                'default-src': '\'self\'',
                'script-src': '\'self\'',
                'style-src': '\'self\' \'unsafe-inline\'',
                'img-src': '\'self\' data:',
            }
        )
    else:
        talisman.init_app(
            app,
            force_https=False,
            content_security_policy=None
        )

    # Register blueprints
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(writings_bp, url_prefix="/api/v1/writings")
    app.register_blueprint(categories_bp, url_prefix="/api/v1/categories")
    app.register_blueprint(tags_bp, url_prefix="/api/v1/tags")
    app.register_blueprint(public_bp, url_prefix="/api/v1/public")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(analytics_bp, url_prefix="/api/v1/analytics")

    # Setup JWT callbacks
    setup_jwt_callbacks()

    # Register error handlers
    register_error_handlers(app)

    # Automatically create tables and configure SQLite pragmas
    with app.app_context():
        # Import models to register them on metadata
        import app.models as _models

        # ── SQLite Performance Pragmas (WAL Mode) ────────────────────────
        # Registered inside app context where db.engine is available.
        # Safe no-ops if the backend is not SQLite (e.g., PostgreSQL).
        @event.listens_for(db.engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, connection_record):
            """Enable WAL journal, foreign keys, and tuned sync mode."""
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA synchronous=NORMAL;")
                cursor.execute("PRAGMA foreign_keys=ON;")
                cursor.execute("PRAGMA cache_size=-64000;")   # 64 MB page cache
                cursor.execute("PRAGMA busy_timeout=5000;")   # 5 s lock wait
            except Exception:
                pass  # non-SQLite backends — silently ignore
            finally:
                cursor.close()

        db.create_all()
        
        # Initialize SQLite FTS5 virtual table and triggers dynamically
        if "sqlite" in str(db.engine.url):
            try:
                conn = db.session.connection().connection
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='writings_fts';")
                if not cursor.fetchone():
                    cursor.execute("""
                        CREATE VIRTUAL TABLE writings_fts USING fts5(
                            writing_id UNINDEXED,
                            title,
                            content
                        );
                    """)
                    cursor.execute("""
                        CREATE TRIGGER writings_ai AFTER INSERT ON writings BEGIN
                            INSERT INTO writings_fts(writing_id, title, content)
                            VALUES (new.id, new.title, new.content);
                        END;
                    """)
                    cursor.execute("""
                        CREATE TRIGGER writings_ad AFTER DELETE ON writings BEGIN
                            DELETE FROM writings_fts WHERE writing_id = old.id;
                        END;
                    """)
                    cursor.execute("""
                        CREATE TRIGGER writings_au AFTER UPDATE ON writings BEGIN
                            UPDATE writings_fts
                            SET title = new.title,
                                content = new.content
                            WHERE writing_id = old.id;
                        END;
                    """)
                    cursor.execute("INSERT INTO writings_fts(writing_id, title, content) SELECT id, title, content FROM writings;")
                    conn.commit()
                cursor.close()
            except Exception as e:
                app.logger.error(f"Failed to initialize SQLite FTS5 table: {str(e)}")
                
        app.logger.info("Database tables initialized successfully.")

    return app


def setup_logging(app):
    """Configure system logging."""
    if not os.path.exists("logs"):
        os.makedirs("logs")

    file_handler = RotatingFileHandler(
        "logs/vault.log",
        maxBytes=10240000, # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    
    app.logger.setLevel(logging.INFO)
    app.logger.info("The Vault Backend startup initialization.")


def setup_jwt_callbacks():
    """Setup Flask-JWT-Extended token checks and custom error returns."""
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        jti = jwt_payload["jti"]
        from app.models.token_block import TokenBlock
        token = TokenBlock.query.filter_by(jti=jti).first()
        return token is not None

    @jwt.unauthorized_loader
    def unauthorized_callback(err_str):
        return jsonify({"message": err_str, "error": "unauthorized"}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"message": "The token has expired", "error": "token_expired"}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"message": "The token has been revoked", "error": "token_revoked"}), 401


def register_error_handlers(app):
    """Register custom global JSON error handlers."""
    @app.errorhandler(RateLimitExceeded)
    def ratelimit_handler(e):
        return jsonify({
            "message": f"Rate limit exceeded: {e.description}",
            "error": "rate_limit_exceeded"
        }), 429

    @app.errorhandler(404)
    def not_found_handler(e):
        return jsonify({"message": "Resource not found", "error": "not_found"}), 404

    @app.errorhandler(500)
    def server_error_handler(e):
        app.logger.error(f"Internal Server Error: {str(e)}")
        return jsonify({"message": "Internal server error", "error": "internal_server_error"}), 500
