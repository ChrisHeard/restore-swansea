from pathlib import Path
import pandas as pd

# Change this to your folder
INPUT_DIR = Path(r"C:\Users\cch85\Documents\Restore Leafletting App\leafletting-app\public\data\ward_streets")

# Output file
OUTPUT_FILE = INPUT_DIR / "ward_streets_merged.csv"

df = pd.read_csv(OUTPUT_FILE)

# Normalize street names to avoid duplicate casing/spacing issues
df["street_name_clean"] = (
    df["name"]
    .astype(str)
    .str.strip()
    .str.lower()
)

# Deduplicate by ward + street name
deduped = (
    df.sort_values("id")
      .drop_duplicates(
          subset=["ward_code", "street_name_clean"],
          keep="first"
      )
)

# Rename columns for Supabase import
deduped = deduped.rename(columns={
    "id": "osm_way_id",
    "name": "street_name",
    "highway": "road_type"
})

# Add default status column
deduped["status"] = "not_started"

# Keep only the columns you want
deduped = deduped[
    [
        "osm_way_id",
        "street_name",
        "road_type",
        "ward_code",
        "ward_name",
        "status"
    ]
]

# Save cleaned CSV
deduped.to_csv(OUTPUT_FILE, index=False)
