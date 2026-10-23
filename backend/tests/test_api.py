
import sys
from pathlib import Path

from fastapi.testclient import TestClient

# Make the backend directory importable when tests run from the project root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app import app  # noqa: E402

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["message"] == "PhishShield API is running"


def test_phishing_email_prediction():
    response = client.post(
        "/analyze",
        json={
            "subject": "Congratulations! You won a prize",
            "sender": "winner@example.com",
            "body": (
                "Claim your prize immediately by clicking this link "
                "and providing your account details."
            ),
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["prediction"] in ["Phishing", "Benign"]
    assert 0 <= result["phishing_score"] <= 100
    assert result["risk_level"] in ["Low", "Medium", "High"]


def test_empty_email_returns_error():
    response = client.post(
        "/analyze",
        json={
            "subject": "",
            "sender": "test@example.com",
            "body": "",
        },
    )

    assert response.status_code == 200
    assert response.json()["error"] == "Email subject and body are empty."
