import os
import unittest
import json
from datetime import datetime, timezone, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.writing import Writing
from app.models.category import Category
from app.models.tag import Tag
from app.models.share_link import ShareLink

class VaultAPITestCase(unittest.TestCase):
    def setUp(self):
        """Set up a blank database before each test."""
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
    def tearDown(self):
        """Destroy the database after each test."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def register_user(self, email, password):
        return self.client.post(
            "/api/v1/auth/register",
            data=json.dumps({"email": email, "password": password}),
            content_type="application/json"
        )

    def login_user(self, email, password):
        return self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": email, "password": password}),
            content_type="application/json"
        )

    def get_auth_headers(self, token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def test_registration_and_login(self):
        # Register user with a compliant complex password
        resp = self.register_user("test@example.com", "SecurePass123!")
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.data)
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "test@example.com")

        # Duplicate email registration attempt
        resp = self.register_user("test@example.com", "AnotherPass123!")
        self.assertEqual(resp.status_code, 409)

        # Successful login
        resp = self.login_user("test@example.com", "SecurePass123!")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIn("access_token", data)

        # Failed login
        resp = self.login_user("test@example.com", "wrongpassword")
        self.assertEqual(resp.status_code, 401)

    def test_password_complexity_rejections(self):
        # 1. No uppercase
        resp = self.register_user("test1@example.com", "secure123!")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Password must contain", json.loads(resp.data)["errors"]["password"][0])

        # 2. No lowercase
        resp = self.register_user("test2@example.com", "SECURE123!")
        self.assertEqual(resp.status_code, 400)

        # 3. No digits
        resp = self.register_user("test3@example.com", "SecurePass!")
        self.assertEqual(resp.status_code, 400)

        # 4. No special characters
        resp = self.register_user("test4@example.com", "SecurePass123")
        self.assertEqual(resp.status_code, 400)

        # 5. Too short
        resp = self.register_user("test5@example.com", "Sec1!")
        self.assertEqual(resp.status_code, 400)

    def test_protected_routes_guard(self):
        resp = self.client.get("/api/v1/writings")
        self.assertEqual(resp.status_code, 401)

    def test_category_crud(self):
        reg_resp = self.register_user("test@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)

        resp = self.client.post(
            "/api/v1/categories",
            headers=headers,
            data=json.dumps({"name": "Poetry", "color_hex": "#d4af37"})
        )
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.data)
        self.assertEqual(data["name"], "Poetry")
        self.assertEqual(data["slug"], "poetry")
        category_id = data["id"]

        resp = self.client.post(
            "/api/v1/categories",
            headers=headers,
            data=json.dumps({"name": "Poetry"})
        )
        self.assertEqual(resp.status_code, 409)

        resp = self.client.get(f"/api/v1/categories/{category_id}", headers=headers)
        self.assertEqual(resp.status_code, 200)

        resp = self.client.put(
            f"/api/v1/categories/{category_id}",
            headers=headers,
            data=json.dumps({"name": "Poetry Updated", "color_hex": "#ffffff"})
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["name"], "Poetry Updated")
        self.assertEqual(data["slug"], "poetry-updated")

        resp = self.client.get("/api/v1/categories", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(json.loads(resp.data)), 1)

        resp = self.client.delete(f"/api/v1/categories/{category_id}", headers=headers)
        self.assertEqual(resp.status_code, 200)

    def test_writing_crud_and_search(self):
        reg_resp = self.register_user("test@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)

        cat_resp = self.client.post(
            "/api/v1/categories",
            headers=headers,
            data=json.dumps({"name": "Shayaris"})
        )
        category_id = json.loads(cat_resp.data)["id"]

        resp = self.client.post(
            "/api/v1/writings",
            headers=headers,
            data=json.dumps({
                "title": "A Fine Shayari",
                "content": "Kuch baat hai ki hasti mit-ti nahi hamari...",
                "content_type": "SHAYARI",
                "category_id": category_id,
                "tags": ["Love", "Classic"],
                "is_favorite": True
            })
        )
        self.assertEqual(resp.status_code, 201)
        writing_data = json.loads(resp.data)
        self.assertEqual(writing_data["title"], "A Fine Shayari")
        self.assertTrue(writing_data["is_favorite"])
        self.assertEqual(len(writing_data["tags"]), 2)
        writing_id = writing_data["id"]

        tags = Tag.query.all()
        self.assertEqual(len(tags), 2)

        resp = self.client.get(f"/api/v1/writings/{writing_id}", headers=headers)
        self.assertEqual(resp.status_code, 200)

        resp = self.client.put(
            f"/api/v1/writings/{writing_id}",
            headers=headers,
            data=json.dumps({
                "title": "A Fine Shayari Updated",
                "content": "Updated content here",
                "content_type": "SHAYARI",
                "category_id": category_id,
                "tags": ["Classic", "Sad"]
            })
        )
        self.assertEqual(resp.status_code, 200)
        updated_data = json.loads(resp.data)
        self.assertEqual(len(updated_data["tags"]), 2)
        tag_names = [t["name"] for t in updated_data["tags"]]
        self.assertIn("Classic", tag_names)
        self.assertIn("Sad", tag_names)
        self.assertNotIn("Love", tag_names)

        resp = self.client.get("/api/v1/writings?q=Shayari", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(json.loads(resp.data)["items"]), 1)

        resp = self.client.patch(f"/api/v1/writings/{writing_id}/favorite", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(json.loads(resp.data)["is_favorite"])

        resp = self.client.patch(f"/api/v1/writings/{writing_id}/archive", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(json.loads(resp.data)["is_archived"])

        resp = self.client.get("/api/v1/writings", headers=headers)
        self.assertEqual(len(json.loads(resp.data)["items"]), 0)

        resp = self.client.get("/api/v1/writings?is_archived=true", headers=headers)
        self.assertEqual(len(json.loads(resp.data)["items"]), 1)

    def test_sharing_and_passcode_expiration(self):
        reg_resp = self.register_user("test@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)

        w_resp = self.client.post(
            "/api/v1/writings",
            headers=headers,
            data=json.dumps({
                "title": "Shared Secret",
                "content": "Secret poem contents...",
                "content_type": "POEM"
            })
        )
        writing_id = json.loads(w_resp.data)["id"]

        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share",
            headers=headers,
            data=json.dumps({
                "passcode": "Secret123",
                "expires_in_hours": 1
            })
        )
        self.assertEqual(resp.status_code, 200)
        share_data = json.loads(resp.data)
        share_token = share_data["access_token"]
        self.assertTrue(share_data["has_passcode"])

        resp = self.client.get(f"/api/v1/public/share/{share_token}")
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(json.loads(resp.data)["passcode_required"])

        resp = self.client.post(
            f"/api/v1/public/share/{share_token}/unlock",
            data=json.dumps({"passcode": "wrong_passcode"}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 401)

        resp = self.client.post(
            f"/api/v1/public/share/{share_token}/unlock",
            data=json.dumps({"passcode": "Secret123"}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["title"], "Shared Secret")

    def test_pdf_export(self):
        reg_resp = self.register_user("test@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)

        w_resp = self.client.post(
            "/api/v1/writings",
            headers=headers,
            data=json.dumps({
                "title": "My Masterpiece",
                "content": "Some lines here...",
                "content_type": "POEM"
            })
        )
        writing_id = json.loads(w_resp.data)["id"]

        resp = self.client.get(f"/api/v1/writings/{writing_id}/export", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/pdf")
        self.assertTrue(resp.data.startswith(b"%PDF"))

    def test_logout_and_revocation(self):
        reg_resp = self.register_user("test@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)

        resp = self.client.get("/api/v1/writings", headers=headers)
        self.assertEqual(resp.status_code, 200)

        resp = self.client.post("/api/v1/auth/logout", headers=headers)
        self.assertEqual(resp.status_code, 200)

        resp = self.client.get("/api/v1/writings", headers=headers)
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(json.loads(resp.data)["error"], "token_revoked")

    def test_advanced_search_engine(self):
        reg_resp = self.register_user("test_search@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)

        # 1. Create target writings
        self.client.post(
            "/api/v1/writings",
            headers=headers,
            data=json.dumps({
                "title": "Beautiful Spring morning",
                "content": "Walking in the flowers under the bright sun.",
                "content_type": "THOUGHT"
            })
        )
        self.client.post(
            "/api/v1/writings",
            headers=headers,
            data=json.dumps({
                "title": "Dark cold winter night",
                "content": "A solitary walk in the winter freezing winds.",
                "content_type": "POEM"
            })
        )
        self.client.post(
            "/api/v1/writings",
            headers=headers,
            data=json.dumps({
                "title": "Classic Shayari",
                "content": "Beautiful Urdu poetry of Ghalib.",
                "content_type": "SHAYARI"
            })
        )

        # 2. Test full-text search matches
        resp = self.client.get("/api/v1/writings?q=Beautiful", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["total"], 2)
        titles = [w["title"] for w in data["items"]]
        self.assertIn("Beautiful Spring morning", titles)
        self.assertIn("Classic Shayari", titles)

        # 3. Test FTS5 wildcard prefix search (e.g. "freez" matches "freezing")
        resp = self.client.get("/api/v1/writings?q=freez", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["title"], "Dark cold winter night")

        # 4. Test strict title filtering
        resp = self.client.get("/api/v1/writings?title=Shayari", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["title"], "Classic Shayari")

        # 5. Test date filtering
        # Start date in the future -> 0 results
        future_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        resp = self.client.get(f"/api/v1/writings?start_date={future_date}", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["total"], 0)

        # Start date in the past -> should return all 3
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        resp = self.client.get(f"/api/v1/writings?start_date={past_date}", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["total"], 3)

    def _setup_sharing_context(self):
        """Helper: register user, create a writing, return (token, headers, writing_id)."""
        reg = self.register_user("share_test@example.com", "SecurePass123!")
        token = json.loads(reg.data)["access_token"]
        headers = self.get_auth_headers(token)
        w = self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Secret Poem", "content": "Hidden beauty...", "content_type": "POEM"})
        )
        writing_id = json.loads(w.data)["id"]
        return token, headers, writing_id

    def test_share_modes(self):
        """Test creating shares with different modes and verify metadata."""
        _, headers, writing_id = self._setup_sharing_context()

        # 1. Public mode (default)
        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"expires_in_hours": 24})
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["share_mode"], "public")
        self.assertFalse(data["has_passcode"])
        self.assertIsNone(data["max_views"])
        public_token = data["access_token"]

        # 2. Passcode mode
        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"share_mode": "passcode", "passcode": "Secret123", "expires_in_hours": 1})
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["share_mode"], "passcode")
        self.assertTrue(data["has_passcode"])
        # Old token should now be revoked (new one generated)
        self.assertNotEqual(data["access_token"], public_token)
        passcode_token = data["access_token"]

        # 3. Verify public reader requires passcode
        resp = self.client.get(f"/api/v1/public/share/{passcode_token}")
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(json.loads(resp.data)["passcode_required"])

        # 4. Verify meta endpoint returns mode info
        resp = self.client.get(f"/api/v1/public/share/{passcode_token}/meta")
        self.assertEqual(resp.status_code, 200)
        meta = json.loads(resp.data)
        self.assertEqual(meta["share_mode"], "passcode")
        self.assertTrue(meta["has_passcode"])

        # 5. Correct passcode unlocks content
        resp = self.client.post(
            f"/api/v1/public/share/{passcode_token}/unlock",
            data=json.dumps({"passcode": "Secret123"}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["title"], "Secret Poem")

        # 6. View-limited mode
        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"share_mode": "view_limited", "max_views": 3})
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data["share_mode"], "view_limited")
        self.assertEqual(data["max_views"], 3)
        self.assertEqual(data["views_remaining"], 3)

        # 7. Invalid share_mode returns 400
        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"share_mode": "invalid_mode"})
        )
        self.assertEqual(resp.status_code, 400)

    def test_brute_force_protection(self):
        """Test that 5 wrong passcode attempts trigger lockout (429)."""
        _, headers, writing_id = self._setup_sharing_context()

        # Create passcode-protected link
        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"share_mode": "passcode", "passcode": "Correct123", "expires_in_hours": 1})
        )
        token = json.loads(resp.data)["access_token"]

        # Submit 4 wrong passcodes — should get 401
        for i in range(4):
            resp = self.client.post(
                f"/api/v1/public/share/{token}/unlock",
                data=json.dumps({"passcode": f"wrong_{i}"}),
                content_type="application/json"
            )
            self.assertEqual(resp.status_code, 401)
            body = json.loads(resp.data)
            self.assertIn("attempts_remaining", body)

        # 5th wrong attempt — should trigger lockout (429)
        resp = self.client.post(
            f"/api/v1/public/share/{token}/unlock",
            data=json.dumps({"passcode": "wrong_final"}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 429)
        body = json.loads(resp.data)
        self.assertIn("lockout_seconds", body)

        # Subsequent attempt while locked — should also be 429
        resp = self.client.post(
            f"/api/v1/public/share/{token}/unlock",
            data=json.dumps({"passcode": "Correct123"}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 429)

    def test_max_views_auto_revoke(self):
        """Test that view-limited links auto-revoke after max_views."""
        _, headers, writing_id = self._setup_sharing_context()

        # Create view-limited link with max 2 views
        resp = self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"share_mode": "view_limited", "max_views": 2})
        )
        token = json.loads(resp.data)["access_token"]

        # View 1 — should succeed
        resp = self.client.get(f"/api/v1/public/share/{token}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["view_count"], 1)

        # View 2 — should succeed but auto-revoke
        resp = self.client.get(f"/api/v1/public/share/{token}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["view_count"], 2)

        # View 3 — link should be dead (404 because is_active is now False)
        resp = self.client.get(f"/api/v1/public/share/{token}")
        self.assertIn(resp.status_code, [404, 410])

    def test_share_links_dashboard(self):
        """Test the /writings/shares endpoint returns all user's active links."""
        _, headers, writing_id = self._setup_sharing_context()

        # Create a second writing
        w2 = self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Second Writing", "content": "More content...", "content_type": "NOTE"})
        )
        writing_id_2 = json.loads(w2.data)["id"]

        # Create share links for both
        self.client.post(
            f"/api/v1/writings/{writing_id}/share", headers=headers,
            data=json.dumps({"share_mode": "public", "expires_in_hours": 24})
        )
        self.client.post(
            f"/api/v1/writings/{writing_id_2}/share", headers=headers,
            data=json.dumps({"share_mode": "passcode", "passcode": "Test123!", "expires_in_hours": 12})
        )

        # Fetch all share links
        resp = self.client.get("/api/v1/writings/shares", headers=headers)
        self.assertEqual(resp.status_code, 200)
        links = json.loads(resp.data)
        self.assertEqual(len(links), 2)

        # Each link should have writing_title
        titles = [l["writing_title"] for l in links]
        self.assertIn("Secret Poem", titles)
        self.assertIn("Second Writing", titles)

        # Verify modes
        modes = {l["writing_title"]: l["share_mode"] for l in links}
        self.assertEqual(modes["Secret Poem"], "public")
        self.assertEqual(modes["Second Writing"], "passcode")

        # GET share status for a specific writing
        resp = self.client.get(f"/api/v1/writings/{writing_id}/share", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.data)["share_mode"], "public")

    def test_single_writing_pdf_export(self):
        """Test single writing PDF export endpoint."""
        reg_resp = self.register_user("pdf_user1@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)
        w1 = self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "HTML Writing", "content": "<p>This is <b>bold</b> text.</p>", "content_type": "NOTE"})
        )
        writing_id = json.loads(w1.data)["id"]
        
        resp = self.client.get(f"/api/v1/writings/{writing_id}/export", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/pdf")
        self.assertTrue(len(resp.data) > 0)

    def test_category_pdf_export(self):
        """Test exporting all writings in a category as a compiled PDF."""
        reg_resp = self.register_user("pdf_user2@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)
        c_resp = self.client.post(
            "/api/v1/categories", headers=headers,
            data=json.dumps({"name": "Sad Sonnets", "color_hex": "#10b981"})
        )
        category_id = json.loads(c_resp.data)["id"]
        
        self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Sonnet 1", "content": "<p>Alas, poor Yorick.</p>", "content_type": "POEM", "category_id": category_id})
        )
        self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Sonnet 2", "content": "<p>To be or not to be.</p>", "content_type": "POEM", "category_id": category_id})
        )
        
        resp = self.client.get(f"/api/v1/categories/{category_id}/export", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/pdf")
        self.assertTrue(len(resp.data) > 0)
        
        c_empty = self.client.post(
            "/api/v1/categories", headers=headers,
            data=json.dumps({"name": "Empty Category", "color_hex": "#10b981"})
        )
        empty_cat_id = json.loads(c_empty.data)["id"]
        resp_empty = self.client.get(f"/api/v1/categories/{empty_cat_id}/export", headers=headers)
        self.assertEqual(resp_empty.status_code, 404)

    def test_collection_pdf_export(self):
        """Test selection-based custom collection PDF export."""
        reg_resp = self.register_user("pdf_user3@example.com", "SecurePass123!")
        token = json.loads(reg_resp.data)["access_token"]
        headers = self.get_auth_headers(token)
        w1 = self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Col Writing 1", "content": "First entry", "content_type": "NOTE"})
        )
        w2 = self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Col Writing 2", "content": "Second entry", "content_type": "NOTE"})
        )
        w3 = self.client.post(
            "/api/v1/writings", headers=headers,
            data=json.dumps({"title": "Col Writing 3", "content": "Third entry", "content_type": "NOTE"})
        )
        
        id1 = json.loads(w1.data)["id"]
        id2 = json.loads(w2.data)["id"]
        
        resp = self.client.post(
            "/api/v1/writings/export-collection", headers=headers,
            data=json.dumps({
                "title": "Selected Works",
                "writing_ids": [id1, id2]
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/pdf")
        self.assertTrue(len(resp.data) > 0)
        
        resp_all = self.client.post(
            "/api/v1/writings/export-collection", headers=headers,
            data=json.dumps({
                "title": "Full Anthology",
                "writing_ids": []
            }),
            content_type="application/json"
        )
        self.assertEqual(resp_all.status_code, 200)
        self.assertEqual(resp_all.mimetype, "application/pdf")
        self.assertTrue(len(resp_all.data) > 0)

if __name__ == "__main__":
    unittest.main()

