import unittest
from app import create_app
from app.extensions import db
from app.models.user import User
from flask_jwt_extended import create_access_token

class TestAdmin(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

        db.create_all()

        # Create normal user
        self.user = User(email="user@test.com", password_hash="pass", display_name="User", role="USER")
        self.admin = User(email="admin@test.com", password_hash="pass", display_name="Admin", role="SUPER_ADMIN")
        db.session.add(self.user)
        db.session.add(self.admin)
        db.session.commit()

        self.user_token = create_access_token(identity=self.user.id, additional_claims={"role": self.user.role})
        self.admin_token = create_access_token(identity=self.admin.id, additional_claims={"role": self.admin.role})

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_cannot_access_admin_users(self):
        headers = {"Authorization": f"Bearer {self.user_token}"}
        res = self.client.get("/api/v1/admin/users", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_admin_users(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = self.client.get("/api/v1/admin/users", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("users", res.json)

if __name__ == "__main__":
    unittest.main()
