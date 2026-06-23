from app.routes.auth import auth_bp
from app.routes.writings import writings_bp
from app.routes.categories import categories_bp
from app.routes.tags import tags_bp
from app.routes.public import public_bp
from app.routes.analytics import analytics_bp

__all__ = [
    "auth_bp",
    "writings_bp",
    "categories_bp",
    "tags_bp",
    "public_bp",
    "analytics_bp",
]

