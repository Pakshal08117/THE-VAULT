import os
import uuid
from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app("development")

with app.app_context():
    email = "pakshalshah08117@gmail.com"
    username = "pakshal shah"
    password = "pakshal08117"
    
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"User {email} already exists. Updating password...")
        user.set_password(password)
        db.session.commit()
    else:
        new_user = User(
            id=str(uuid.uuid4()),
            email=email,
            display_name=username
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        print(f"Successfully created admin user: {email} with password: {password}")
