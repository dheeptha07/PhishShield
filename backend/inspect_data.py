
import pandas as pd

file_path = "data/meajor_cleaned_preprocessed.csv"

df = pd.read_csv(
    file_path,
    usecols=["subject", "body", "label"],
    nrows=20
)

for label in sorted(df["label"].dropna().unique()):
    sample = df[df["label"] == label].head(2)

    print(f"\n{'=' * 35}")
    print(f"LABEL: {label}")
    print("=" * 35)

    for _, row in sample.iterrows():
        print("Subject:", str(row["subject"])[:150])
        print("Body:", str(row["body"])[:250])
        print("-" * 25)
