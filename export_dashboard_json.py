import pandas as pd
import os

input_file = "model_output/inference_predictions_explained.csv"
output_file = "delay-risk-dashboard/dashboard/data/projects.json"

df = pd.read_csv(input_file)

os.makedirs(os.path.dirname(output_file), exist_ok=True)

df.to_json(
    output_file,
    orient="records",
    indent=2
)

print(f"Exported {len(df)} projects to {output_file}")