
from pathlib import Path

import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="PhishShield API")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "phishshield_model.pkl"

model = joblib.load(MODEL_PATH)


# Allow requests from the local Chrome extension during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class EmailRequest(BaseModel):
    subject: str = ""
    sender: str = ""
    body: str = ""


@app.get("/")
def home():
    return {"message": "PhishShield API is running"}


@app.post("/analyze")
def analyze_email(email: EmailRequest):
    email_text = f"{email.subject} {email.body}".strip()

    if not email_text:
        return {"error": "Email subject and body are empty."}

    prediction = int(model.predict([email_text])[0])
    probabilities = model.predict_proba([email_text])[0]

    classes = list(model.classes_)
    phishing_index = classes.index(1)
    phishing_score = float(probabilities[phishing_index]) * 100

    # Keep the risk label consistent with the model prediction.
    if prediction == 1:
        if phishing_score >= 70:
            risk = "High"
        else:
            risk = "Medium"
    else:
        risk = "Low"

    return {
        "prediction": (
            "Phishing" if prediction == 1 else "Benign"
        ),
        "label": prediction,
        "phishing_score": round(phishing_score, 2),
        "risk_level": risk,
        "subject": email.subject,
        "sender": email.sender,
        "note": (
            "Model score is not a calibrated probability "
            "or a guarantee that an email is safe."
        ),
    }
