import pandas as pd


# ---------------------------------------------------------
# Files to update
# ---------------------------------------------------------
FILES = [
    "infra_projects_ml_ready_clean.csv",
    "infra_projects_train.csv",
    "infra_projects_val.csv",
    "infra_projects_test.csv",
    "infra_projects_inference_unlabeled.csv",
]

NARRATIVE_FILE = "infra_projects_narratives.csv"


# ---------------------------------------------------------
# Documentation-related phrases
# ---------------------------------------------------------
DOCUMENTATION_PATTERNS = [
    "incomplete document",
    "incomplete documents",
    "missing document",
    "missing documents",
    "documentation pending",
    "documents pending",
    "paperwork pending",
    "documentation issue",
    "documentation incomplete",
    "required documents pending",
    "documents not submitted",
    "document not submitted",
    "land records pending",
    "land record pending",
    "records not available",
    "record not available",
    "land records unavailable",
    "land record unavailable",
    "paperwork incomplete",
    "records incomplete",
]


# ---------------------------------------------------------
# Load narratives
# ---------------------------------------------------------
print("Loading narratives...")

narr = pd.read_csv(NARRATIVE_FILE)

print(f"Narrative rows: {len(narr)}")


# ---------------------------------------------------------
# Automatically find the narrative text column
# ---------------------------------------------------------
possible_text_columns = [
    "raw_narrative",
    "narrative_text",
    "narrative",
    "text",
]

text_col = None

for col in possible_text_columns:
    if col in narr.columns:
        text_col = col
        break

if text_col is None:
    raise ValueError(
        f"Could not find narrative text column. Available columns: {list(narr.columns)}"
    )

print(f"Using narrative column: {text_col}")


# ---------------------------------------------------------
# Create documentation flag
# ---------------------------------------------------------
text = narr[text_col].fillna("").astype(str).str.lower()


pattern = "|".join(
    [p.replace(" ", r"\s+") for p in DOCUMENTATION_PATTERNS]
)

narr["kw_incomplete_documentation"] = (
    text.str.contains(pattern, regex=True, na=False).astype(int)
)


print(
    "Narrative documentation flags:",
    narr["kw_incomplete_documentation"].sum()
)


# ---------------------------------------------------------
# Keep only project_id + quarter + new feature
# ---------------------------------------------------------
flag_df = narr[
    ["project_id", "quarter", "kw_incomplete_documentation"]
].copy()


# ---------------------------------------------------------
# Update each ML dataset
# ---------------------------------------------------------
for file in FILES:

    print(f"\nProcessing {file}...")

    df = pd.read_csv(file)

    # Remove old version if it exists
    if "kw_incomplete_documentation" in df.columns:
        df = df.drop(columns=["kw_incomplete_documentation"])

    # Merge using project + quarter
    df = df.merge(
        flag_df,
        on=["project_id", "quarter"],
        how="left",
        validate="many_to_one",
    )

    # No narrative match = no detected documentation issue
    df["kw_incomplete_documentation"] = (
        df["kw_incomplete_documentation"]
        .fillna(0)
        .astype(int)
    )

    df.to_csv(file, index=False)

    print(
        f"Rows: {len(df)} | "
        f"Documentation flag = 1: "
        f"{df['kw_incomplete_documentation'].sum()}"
    )


print("\nDONE.")