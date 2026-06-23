"""
Application configuration module.

Provides a hierarchy of configuration classes (Base, Development, Production,
Testing) that load settings from environment variables via python-dotenv.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env from the backend directory
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, ".env"))


class Config:
    """Base configuration shared by all environments."""

    # --- Flask core ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-secret-key")
    BASE_DIR: str = basedir

    # --- SQLAlchemy ---
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'vault.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {"pool_pre_ping": True}

    # --- JWT ---
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "fallback-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    )
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(
        seconds=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000"))
    )
    JWT_TOKEN_LOCATION: list = ["headers"]
    JWT_HEADER_NAME: str = "Authorization"
    JWT_HEADER_TYPE: str = "Bearer"
    JWT_ERROR_MESSAGE_KEY: str = "message"
    JWT_BLACKLIST_ENABLED: bool = True

   # --- CORS ---
    CORS_ORIGINS = ["http://localhost:3000","http://localhost:5173","https://the-vault-ashy-phi.vercel.app"]

    CORS_SUPPORTS_CREDENTIALS = True

    # --- Rate Limiting ---
    RATELIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "100/hour")
    RATELIMIT_STORAGE_URI: str = "memory://"
    RATELIMIT_STRATEGY: str = "fixed-window"

    # --- Talisman (CSP / HTTPS) ---
    TALISMAN_ENABLED: bool = True


class DevelopmentConfig(Config):
    """Development-specific overrides."""

    DEBUG: bool = True
    TALISMAN_ENABLED: bool = False  # No forced HTTPS in dev
    SQLALCHEMY_ECHO: bool = False


class ProductionConfig(Config):
    """Production-specific overrides."""

    DEBUG: bool = False
    TALISMAN_ENABLED: bool = True
    RATELIMIT_STORAGE_URI: str = os.getenv("REDIS_URL", "memory://")
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    }


class TestingConfig(Config):
    """Testing-specific overrides."""

    TESTING: bool = True
    DEBUG: bool = True
    TALISMAN_ENABLED: bool = False
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(seconds=5)
    RATELIMIT_ENABLED: bool = False


config_by_name: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
