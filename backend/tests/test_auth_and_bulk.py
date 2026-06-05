"""Backend tests for SHREE RAJ & CO - Auth (JWT) and Bulk CSV Import features.

Covers:
- POST /api/auth/register (new user, duplicate email)
- POST /api/auth/login (valid, invalid)
- GET  /api/auth/me (valid token, missing token, bad token)
- POST /api/bulk/clients (success, partial-errors, no-auth)
- POST /api/bulk/documents (success, invalid client_id, no-auth)
- Existing endpoints still work (clients/documents/tasks)
- Pre-existing admin user can login
"""
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load public URL from frontend/.env
load_dotenv(Path(__file__).parent.parent.parent / "frontend" / ".env")
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL", "")).rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@shreerajco.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def random_email():
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture(scope="module")
def registered_user(session, random_email):
    """Register a new random user once for this module."""
    payload = {"email": random_email, "password": "Secret@123", "name": "TEST User"}
    r = session.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"
    assert "user" in data and data["user"]["email"] == random_email.lower()
    return {"email": random_email, "password": "Secret@123", "token": data["access_token"], "user": data["user"]}


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# =================== AUTH TESTS ===================
class TestAuthRegister:
    def test_register_new_user_returns_token_and_user(self, registered_user):
        assert registered_user["token"]
        assert registered_user["user"]["id"]
        assert registered_user["user"]["email"]

    def test_register_duplicate_email_returns_400(self, session, registered_user):
        r = session.post(f"{API}/auth/register", json={
            "email": registered_user["email"],
            "password": "AnotherPass@1",
            "name": "Dup",
        })
        assert r.status_code == 400, f"expected 400 dup, got {r.status_code} {r.text}"
        assert "already" in r.text.lower() or "registered" in r.text.lower()


class TestAuthLogin:
    def test_login_valid_credentials(self, session, registered_user):
        r = session.post(f"{API}/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == registered_user["email"].lower()

    def test_login_invalid_password_returns_400(self, session, registered_user):
        r = session.post(f"{API}/auth/login", json={
            "email": registered_user["email"],
            "password": "WrongPass!",
        })
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_login_unknown_email_returns_400(self, session):
        r = session.post(f"{API}/auth/login", json={
            "email": f"nope_{uuid.uuid4().hex[:6]}@example.com",
            "password": "Whatever@1",
        })
        assert r.status_code == 400

    def test_admin_account_can_login(self, session):
        """Pre-existing admin user from earlier registration."""
        r = session.post(f"{API}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
        })
        if r.status_code == 400:
            # Admin may not exist yet in this DB - register it once.
            reg = session.post(f"{API}/auth/register", json={
                "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "name": "Admin",
            })
            assert reg.status_code in (200, 400), reg.text
            r = session.post(f"{API}/auth/login", json={
                "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
            })
        assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
        assert "access_token" in r.json()


class TestAuthMe:
    def test_me_with_valid_token(self, session, registered_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers(registered_user["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == registered_user["email"].lower()
        assert data["id"] == registered_user["user"]["id"]

    def test_me_without_token_returns_401(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401, f"expected 401, got {r.status_code} {r.text}"

    def test_me_invalid_token_returns_401(self, session):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert r.status_code == 401


# =================== BULK CLIENTS ===================
class TestBulkClients:
    created_ids = []

    def test_bulk_clients_requires_auth(self, session):
        csv_data = "firm_name,owner_name,mobile,email\nABC Co,John,9999999999,john@abc.com\n"
        r = requests.post(f"{API}/bulk/clients", json={"csv_data": csv_data})
        assert r.status_code == 401

    def test_bulk_clients_imports_two_rows(self, session, registered_user):
        suffix = uuid.uuid4().hex[:6]
        csv_data = (
            "firm_name,owner_name,mobile,email\n"
            f"TEST_ABC Co {suffix},John,9999999999,john_{suffix}@abc.com\n"
            f"TEST_XYZ Co {suffix},Jane,8888888888,jane_{suffix}@xyz.com\n"
        )
        r = session.post(
            f"{API}/bulk/clients",
            json={"csv_data": csv_data},
            headers=auth_headers(registered_user["token"]),
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["created_count"] == 2, f"expected 2, got {data}"
        assert len(data["errors"]) == 0
        # Verify persistence via GET /api/clients
        listing = session.get(f"{API}/clients").json()
        firm_names = {c["firm_name"] for c in listing}
        assert f"TEST_ABC Co {suffix}" in firm_names
        assert f"TEST_XYZ Co {suffix}" in firm_names
        # Track for cleanup
        for c in listing:
            if c["firm_name"] in (f"TEST_ABC Co {suffix}", f"TEST_XYZ Co {suffix}"):
                TestBulkClients.created_ids.append(c["id"])

    def test_bulk_clients_partial_errors(self, session, registered_user):
        suffix = uuid.uuid4().hex[:6]
        csv_data = (
            "firm_name,owner_name,mobile,email\n"
            f"TEST_Valid {suffix},Owner,9999999999,v@x.com\n"
            ",NoFirm,1111111111,bad@x.com\n"  # missing firm_name -> error
            f"TEST_Valid2 {suffix},Owner2,2222222222,\n"
        )
        r = session.post(
            f"{API}/bulk/clients",
            json={"csv_data": csv_data},
            headers=auth_headers(registered_user["token"]),
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created_count"] == 2
        assert len(data["errors"]) == 1
        assert "Missing required" in data["errors"][0] or "Row" in data["errors"][0]
        # cleanup
        listing = session.get(f"{API}/clients").json()
        for c in listing:
            if c["firm_name"] in (f"TEST_Valid {suffix}", f"TEST_Valid2 {suffix}"):
                TestBulkClients.created_ids.append(c["id"])

    @classmethod
    def teardown_class(cls):
        s = requests.Session()
        for cid in cls.created_ids:
            try:
                s.delete(f"{API}/clients/{cid}")
            except Exception:
                pass


# =================== BULK DOCUMENTS ===================
class TestBulkDocuments:
    @pytest.fixture(scope="class")
    def bulk_client(self, registered_user):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        c = s.post(f"{API}/clients", json={
            "firm_name": f"TEST_BulkDocClient_{uuid.uuid4().hex[:6]}",
            "owner_name": "TEST Owner",
            "mobile": "7777777777",
        }).json()
        yield c
        s.delete(f"{API}/clients/{c['id']}")

    def test_bulk_documents_requires_auth(self, bulk_client):
        csv_data = "doc_name,status\nPAN Card,submitted\n"
        r = requests.post(f"{API}/bulk/documents", json={
            "client_id": bulk_client["id"], "csv_data": csv_data,
        })
        assert r.status_code == 401

    def test_bulk_documents_invalid_client_returns_404(self, session, registered_user):
        csv_data = "doc_name,status\nPAN Card,submitted\n"
        r = session.post(
            f"{API}/bulk/documents",
            json={"client_id": "non-existent-id", "csv_data": csv_data},
            headers=auth_headers(registered_user["token"]),
        )
        assert r.status_code == 404, r.text

    def test_bulk_documents_imports_two(self, session, registered_user, bulk_client):
        csv_data = (
            "doc_name,status,storage_location,uploaded_to_accounting\n"
            "PAN Card,submitted,Cabinet A,true\n"
            "Bank Statement,pending,,false\n"
        )
        r = session.post(
            f"{API}/bulk/documents",
            json={"client_id": bulk_client["id"], "csv_data": csv_data},
            headers=auth_headers(registered_user["token"]),
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["created_count"] == 2
        # Verify via GET
        docs = session.get(f"{API}/documents/client/{bulk_client['id']}").json()
        names = {d["doc_name"]: d for d in docs}
        assert "PAN Card" in names
        assert "Bank Statement" in names
        assert names["PAN Card"]["status"] == "submitted"
        assert names["PAN Card"]["storage_location"] == "Cabinet A"
        assert names["PAN Card"]["uploaded_to_accounting"] is True
        assert names["Bank Statement"]["status"] == "pending"
        assert names["Bank Statement"]["uploaded_to_accounting"] is False


# =================== EXISTING ENDPOINTS STILL WORK ===================
class TestExistingEndpointsStillWork:
    def test_get_clients_no_auth_still_works(self, session):
        r = session.get(f"{API}/clients")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_documents_no_auth_still_works(self, session):
        r = session.get(f"{API}/documents")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_tasks_no_auth_still_works(self, session):
        r = session.get(f"{API}/tasks")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_dashboard_stats(self, session):
        r = session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        for key in ["clients", "tasks", "documents"]:
            assert key in r.json()

    def test_create_and_delete_client_unchanged(self, session):
        payload = {
            "firm_name": f"TEST_Existing_{uuid.uuid4().hex[:6]}",
            "owner_name": "TEST",
            "mobile": "5555555555",
        }
        r = session.post(f"{API}/clients", json=payload)
        assert r.status_code == 200
        cid = r.json()["id"]
        # GET it back
        g = session.get(f"{API}/clients/{cid}")
        assert g.status_code == 200
        # cleanup
        d = session.delete(f"{API}/clients/{cid}")
        assert d.status_code == 200
