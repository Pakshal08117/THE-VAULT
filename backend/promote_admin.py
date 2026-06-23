"""Promote the admin user to SUPER_ADMIN role."""
from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app("development")

with app.app_context():
    email = "pakshalshah08117@gmail.com"
    user = User.query.filter_by(email=email).first()
    if user:
        old_role = user.role
        user.role = "SUPER_ADMIN"
        db.session.commit()
        print(f"[OK] Promoted '{email}' from {old_role} -> SUPER_ADMIN")
    else:
        print(f"[ERR] User '{email}' not found. Run seed_admin.py first.")
