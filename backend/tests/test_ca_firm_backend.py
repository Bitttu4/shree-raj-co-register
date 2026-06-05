"""Backend tests for SHREE RAJ & CO CA firm register.
Tests:
- Client CRUD (with PUT update)
- Document CRUD with new fields (last_entry_date, uploaded_to_accounting)
- Task CRUD
- AI endpoints (generate-message, generate-cheatsheet, daily-summary)
  - Verify plain text output (no markdown)
"""
import os
import re
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load frontend .env to get the public URL the user actually sees
load_dotenv(Path(__file__).parent.parent.parent / "frontend" / ".env")

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL", "")).rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

MARKDOWN_PATTERNS = [
    r"\*\*",       # bold
    r"(?<!\w)\*(?!\*)",  # single asterisk for italic/bullet
    r"(?<!\w)_[^_\n]+_(?!\w)",  # underscore italic
    r"^#{1,6}\s",  # heading lines
]

def has_markdown(text: str) -> list:
    """Return list of markdown patterns found."""
    found = []
    for pat in MARKDOWN_PATTERNS:
        if re.search(pat, text, re.MULTILINE):
            found.append(pat)
    return found


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_client(session):
    payload = {
        "firm_name": "TEST_ABC Traders",
        "owner_name": "TEST Ramesh",
        "mobile": "9999999991",
        "email": "test_abc@example.com",
        "address": "TEST Address line",
    }
    r = session.post(f"{API}/clients", json=payload)
    assert r.status_code == 200, f"Create client failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["firm_name"] == payload["firm_name"]
    assert "id" in data
    yield data
    # Cleanup
    session.delete(f"{API}/clients/{data['id']}")


# ============ Client tests ============
class TestClients:
    def test_get_clients(self, session):
        r = session.get(f"{API}/clients")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_client_by_id(self, session, created_client):
        r = session.get(f"{API}/clients/{created_client['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == created_client["id"]

    def test_update_client_all_fields(self, session, created_client):
        cid = created_client["id"]
        upd = {
            "firm_name": "TEST_ABC Traders UPDATED",
            "owner_name": "TEST Ramesh UPDATED",
            "mobile": "8888888881",
            "email": "test_updated@example.com",
            "address": "TEST New Address",
        }
        r = session.put(f"{API}/clients/{cid}", json=upd)
        assert r.status_code == 200, f"PUT client failed: {r.status_code} {r.text}"
        data = r.json()
        for k, v in upd.items():
            assert data[k] == v, f"Field {k} not updated: {data[k]} != {v}"

        # Verify persistence via GET
        r2 = session.get(f"{API}/clients/{cid}")
        assert r2.status_code == 200
        for k, v in upd.items():
            assert r2.json()[k] == v


# ============ Document tests ============
class TestDocuments:
    def test_create_document_with_new_fields(self, session, created_client):
        payload = {
            "client_id": created_client["id"],
            "doc_name": "TEST_GST Return",
            "status": "pending",
            "storage_location": "Cabinet A1",
            "softcopy_location": "D:/Clients/TEST/",
            "return_status": False,
            "last_entry_date": "2026-01-15",
            "uploaded_to_accounting": False,
        }
        r = session.post(f"{API}/documents", json=payload)
        assert r.status_code == 200, f"Create doc failed: {r.text}"
        data = r.json()
        assert data["last_entry_date"] == "2026-01-15"
        assert data["uploaded_to_accounting"] is False
        assert "deadline_date" not in data, "deadline_date field should be removed"
        pytest.doc_id = data["id"]

    def test_get_document_has_new_fields(self, session):
        r = session.get(f"{API}/documents/{pytest.doc_id}")
        assert r.status_code == 200
        data = r.json()
        assert "last_entry_date" in data
        assert "uploaded_to_accounting" in data
        assert "deadline_date" not in data

    def test_update_document_all_fields(self, session):
        upd = {
            "doc_name": "TEST_GST Return UPDATED",
            "status": "submitted",
            "storage_location": "Cabinet B2",
            "softcopy_location": "D:/Updated/",
            "return_status": True,
            "last_entry_date": "2026-01-31",
            "uploaded_to_accounting": True,
        }
        r = session.put(f"{API}/documents/{pytest.doc_id}", json=upd)
        assert r.status_code == 200, f"PUT doc failed: {r.text}"
        data = r.json()
        for k, v in upd.items():
            assert data[k] == v, f"Doc field {k} not updated: {data[k]} != {v}"

        # Verify persistence
        r2 = session.get(f"{API}/documents/{pytest.doc_id}")
        for k, v in upd.items():
            assert r2.json()[k] == v

    def test_list_client_documents(self, session, created_client):
        r = session.get(f"{API}/documents/client/{created_client['id']}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(d["id"] == pytest.doc_id for d in r.json())

    def test_delete_document(self, session):
        r = session.delete(f"{API}/documents/{pytest.doc_id}")
        assert r.status_code == 200
        r2 = session.get(f"{API}/documents/{pytest.doc_id}")
        assert r2.status_code == 404


# ============ Task tests ============
class TestTasks:
    def test_create_and_update_task(self, session, created_client):
        payload = {
            "client_id": created_client["id"],
            "task_name": "TEST_File ITR",
            "description": "Filing ITR for FY",
            "all_docs_submitted": False,
        }
        r = session.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        task = r.json()
        tid = task["id"]
        assert task["is_completed"] is False

        # Mark complete
        r2 = session.put(f"{API}/tasks/{tid}", json={"is_completed": True})
        assert r2.status_code == 200
        assert r2.json()["is_completed"] is True
        assert r2.json()["completed_at"] is not None

        # Cleanup
        session.delete(f"{API}/tasks/{tid}")


# ============ AI endpoints ============
class TestAI:
    @pytest.fixture(scope="class")
    def ai_client_with_data(self, session):
        # Create dedicated client and pending doc/task
        c = session.post(f"{API}/clients", json={
            "firm_name": "TEST_AI Firm",
            "owner_name": "TEST AI Owner",
            "mobile": "7777777771",
        }).json()
        d = session.post(f"{API}/documents", json={
            "client_id": c["id"],
            "doc_name": "TEST_Bank Statement",
            "status": "pending",
            "last_entry_date": "2026-01-10",
            "uploaded_to_accounting": False,
        }).json()
        t = session.post(f"{API}/tasks", json={
            "client_id": c["id"],
            "task_name": "TEST_Prepare Books",
        }).json()
        yield c
        session.delete(f"{API}/clients/{c['id']}")

    def test_generate_message_non_streaming_plain_text(self, session, ai_client_with_data):
        r = session.post(f"{API}/ai/generate-message", json={
            "client_id": ai_client_with_data["id"],
            "message_type": "pending_docs",
        }, timeout=90)
        assert r.status_code == 200, f"AI message failed: {r.status_code} {r.text}"
        # Should be JSON, not streaming
        data = r.json()
        assert "message" in data
        assert "client" in data
        msg = data["message"]
        assert isinstance(msg, str) and len(msg) > 20
        md = has_markdown(msg)
        assert not md, f"Markdown detected in message: {md}\nContent:\n{msg}"

    def test_generate_cheatsheet_plain_text(self, session, ai_client_with_data):
        r = session.post(f"{API}/ai/generate-cheatsheet", json={
            "client_id": ai_client_with_data["id"],
        }, timeout=90)
        assert r.status_code == 200, f"Cheatsheet failed: {r.status_code} {r.text}"
        data = r.json()
        assert "content" in data
        content = data["content"]
        assert isinstance(content, str) and len(content) > 20
        md = has_markdown(content)
        assert not md, f"Markdown detected in cheatsheet: {md}\nContent:\n{content[:500]}"

    def test_daily_summary_plain_text(self, session):
        r = session.post(f"{API}/ai/daily-summary", json={}, timeout=90)
        assert r.status_code == 200, f"Daily summary failed: {r.status_code} {r.text}"
        data = r.json()
        assert "summary" in data
        assert "stats" in data
        summary = data["summary"]
        assert isinstance(summary, str) and len(summary) > 20
        md = has_markdown(summary)
        assert not md, f"Markdown detected in daily summary: {md}\nContent:\n{summary[:500]}"


# ============ Dashboard ============
class TestDashboard:
    def test_dashboard_stats(self, session):
        r = session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        for key in ["clients", "tasks", "documents"]:
            assert key in data
