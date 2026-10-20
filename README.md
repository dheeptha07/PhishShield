# 🛡️ PhishShield — AI-Powered Phishing Email Detection

PhishShield is a Chrome extension that helps identify potentially malicious emails in **Gmail and Outlook on the web** using machine learning and rule-based analysis. It analyzes email content and highlights suspicious messages to help users make safer decisions.

## ✨ Features

- **Browser extension:** Designed to work with Gmail and Outlook on the web in Chrome.
- **Machine learning detection:** Uses a trained classification model to assess email content.
- **Rule-based analysis:** Checks for suspicious language, urgency, fake prizes, account-security threats, and potentially suspicious links or attachments.
- **Risk assessment:** Combines detection results to help users recognize potentially suspicious emails.
- **Local API:** Uses a FastAPI backend to process email analysis requests.
- **Privacy-conscious architecture:** Designed to analyze emails through a locally running backend during development.

## 🧰 Tech Stack

- Python
- Machine Learning and scikit-learn
- FastAPI
- JavaScript, HTML, and CSS
- Chrome Extension APIs
- Joblib
- Gmail and Outlook on the web

## 🏗️ Architecture

1. The Chrome extension extracts relevant email information from a supported webmail page.
2. The extension sends the extracted information to the local FastAPI backend.
3. The backend applies the trained machine learning model and analysis rules.
4. The results are returned to the extension for display.

## 📊 Model Evaluation

The current training experiment reported the following results:

| Metric | Result |
|---|---:|
| Usable emails in dataset | 103,512 |
| Benign emails | 57,122 |
| Phishing emails | 46,390 |
| Test accuracy | 97.85% |

The reported confusion matrix was:

| Actual / Predicted | Benign | Phishing |
|---|---:|---:|
| Benign | 11,186 | 239 |
| Phishing | 207 | 9,071 |

These results are from the project's reported evaluation run. Actual performance on new emails may differ, and model predictions should not be treated as a guarantee that an email is safe or malicious.

## 🚀 Getting Started

### Prerequisites

- Google Chrome
- Python 3.10 or a compatible version for the installed dependencies
- A local Python environment

### 1. Clone the repository

```bash
git clone https://github.com/dheeptha07/PhishShield.git
cd PhishShield
```

### 2. Install backend dependencies

Create and activate a virtual environment:

```bash
python -m venv .venv
```

On Windows:

```powershell
.venv\Scripts\activate
```

Install the dependencies listed in the project's requirements file, if provided:

```bash
pip install -r requirements.txt
```

If the repository does not contain a `requirements.txt`, install the backend dependencies documented by the project before proceeding.

### 3. Start the backend

Run the FastAPI application using the actual Python module filename in the repository. For example, if the file is named `main.py`:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Keep the backend running while testing the extension. The extension's configured API URL must match the backend address.

### 4. Load the Chrome extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project's extension folder containing `manifest.json`.
5. Open Gmail or Outlook on the web and test the extension on sample emails.

Use only test emails that you are authorized to analyze. Avoid including real personal or confidential email content in screenshots or public demonstrations.

## 🧪 Testing

Test the extension with a variety of examples:

- A legitimate email with ordinary language.
- An email containing urgent account-verification requests.
- A fake prize or payment message.
- An email with suspicious links or attachment language.

Compare the displayed assessment with the known test case. Detection is probabilistic, so legitimate emails can be flagged and phishing emails can be missed.

## 🔒 Security and Limitations

- Keep API keys, credentials, private email content, and local environment files out of the public repository.
- The development backend is configured to run locally; a public deployment would require appropriate authentication, access controls, and secure transport.
- Machine learning and keyword rules can produce false positives and false negatives.
- This project is an assistive security tool, not a replacement for careful verification of email senders, URLs, and requests for sensitive information.

## 🔮 Future Improvements

- Improve extraction consistency across Gmail and Outlook on the web.
- Add clearer explanations for risk indicators.
- Expand evaluation to independent, unseen email datasets.
- Improve automated testing and error handling.
- Add privacy and security controls for any future hosted deployment.

## 👩‍💻 Author

**Dheeptha M.**

- GitHub: [@dheeptha07](https://github.com/dheeptha07)

---

*PhishShield is an educational project exploring machine learning and browser-based phishing detection.*
