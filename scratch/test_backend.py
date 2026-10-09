import sys
import os
import unittest

backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base
from app.seed import seed_initial_admin
from app.config import settings

class TestSeparatePortalsAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        seed_initial_admin()
        cls.client = TestClient(app)

        # Create a active contractor for testing
        admin_login = cls.client.post(
            "/api/auth/login",
            json={
                "email": settings.INITIAL_ADMIN_EMAIL,
                "password": settings.INITIAL_ADMIN_PASSWORD
            }
        )
        cls.admin_token = admin_login.json()["access_token"]

        cls.client.post(
            "/api/contractors",
            json={
                "contractor": {
                    "first_name": "Portal",
                    "fathers_name": "Test",
                    "surname": "Contractor",
                    "mobile_number": "9998887770",
                    "email": "portal.contractor@gov.org",
                    "contractor_reg_number": "REG-PORTAL-01",
                    "business_address": "Street 1",
                    "state": "Maharashtra",
                    "district": "Mumbai",
                    "pin_code": "400001",
                    "password": "ContractorPass123!",
                    "confirm_password": "ContractorPass123!",
                    "status": "Active"
                },
                "contracts": [],
                "is_draft": False
            },
            headers={"Authorization": f"Bearer {cls.admin_token}"}
        )

    def test_01_admin_login_on_contractor_endpoint_denied(self):
        response = self.client.post(
            "/api/auth/contractor-login",
            json={
                "email": settings.INITIAL_ADMIN_EMAIL,
                "password": settings.INITIAL_ADMIN_PASSWORD
            }
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Access Denied: Administrative accounts must log in through the Admin Portal", response.json()["detail"])
        print("[OK] Admin denied on Contractor Login Portal passed")

    def test_02_contractor_login_on_admin_endpoint_denied(self):
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": "portal.contractor@gov.org",
                "password": "ContractorPass123!"
            }
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Access Denied: Contractor accounts must log in through the Contractor Portal", response.json()["detail"])
        print("[OK] Contractor denied on Admin Login Portal passed")

    def test_03_contractor_login_on_contractor_endpoint_success(self):
        response = self.client.post(
            "/api/auth/contractor-login",
            json={
                "email": "portal.contractor@gov.org",
                "password": "ContractorPass123!"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user_type"], "contractor")
        cls_contractor_token = data["access_token"]
        print("[OK] Contractor login on Contractor Portal endpoint passed")

        # Test contractor token attempting admin endpoint -> must be denied
        admin_route_resp = self.client.get(
            "/api/contractors",
            headers={"Authorization": f"Bearer {cls_contractor_token}"}
        )
        self.assertEqual(admin_route_resp.status_code, 403)
        print("[OK] Contractor token blocked from Admin API routes passed")

if __name__ == "__main__":
    unittest.main()
