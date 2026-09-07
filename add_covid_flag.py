import pandas as pd
import os

files = [
    "infra_projects_ml_ready_clean.csv",
    "infra_projects_train.csv",
    "infra_projects_val.csv",
    "infra_projects_test.csv",
    "infra_projects_inference_unlabeled.csv",
]

covid_quarters = {
    "Q1-2020-21", "Q2-2020-21", "Q3-2020-21", "Q4-2020-21",
    "Q1-2021-22", "Q2-2021-22", "Q3-2021-22", "Q4-2021-22"
}

for file in files:
    print(f"Processing {file}...")

    df = pd.read_csv(file)

    df["covid_period"] = df["quarter"].isin(covid_quarters).astype(int)

    df.to_csv(file, index=False)

    print(
        f"  Added covid_period | "
        f"COVID rows = {df['covid_period'].sum()} | "
        f"Total rows = {len(df)}"
    )

print("\nDone.")