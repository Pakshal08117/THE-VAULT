from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_talisman import Talisman
from flask_migrate import Migrate

# Initialize SQLAlchemy
db = SQLAlchemy()

# Initialize JWT Manager
jwt = JWTManager()

# Initialize Rate Limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    strategy="fixed-window"
)

# Initialize CORS
cors = CORS()

# Initialize Talisman
talisman = Talisman()

# Initialize Flask-Migrate (Alembic wrapper)
migrate = Migrate()
