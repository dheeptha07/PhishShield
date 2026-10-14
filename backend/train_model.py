
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

DATA_PATH = "data/meajor_cleaned_preprocessed.csv"
MODEL_PATH = "phishshield_model.pkl"

print("Loading dataset...")

df = pd.read_csv(
    DATA_PATH,
    usecols=["subject", "body", "label"]
)

# Remove rows with missing labels or email content
df = df.dropna(subset=["subject", "body", "label"])

# Keep only the documented labels
df = df[df["label"].isin([0, 1])]

# Combine the subject and body
df["email_text"] = (
    df["subject"].astype(str) + " " +
    df["body"].astype(str)
).str.strip()

# Remove empty email messages
df = df[df["email_text"].str.len() > 0]

# Remove duplicate messages
df = df.drop_duplicates(subset=["email_text"])

X = df["email_text"]
y = df["label"].astype(int)

print(f"Usable emails: {len(df)}")
print("\nLabel counts:")
print(y.value_counts().sort_index())

# Split before fitting the model
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining model...")

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            max_features=50000,
            ngram_range=(1, 2),
            sublinear_tf=True
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000,
            class_weight="balanced"
        )
    )
])

model.fit(X_train, y_train)

print("\nEvaluating model...")

predictions = model.predict(X_test)

print(f"\nAccuracy: {accuracy_score(y_test, predictions):.4f}")

print("\nClassification report:")
print(
    classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["Benign", "Phishing"],
        zero_division=0
    )
)

print("\nConfusion matrix:")
print(
    confusion_matrix(
        y_test,
        predictions,
        labels=[0, 1]
    )
)

joblib.dump(model, MODEL_PATH)

print(f"\nModel saved to: {MODEL_PATH}")
