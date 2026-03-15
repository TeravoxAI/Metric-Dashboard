"""
One-time script to import historical OpenRouter CSV exports into Supabase.
Run with: python scripts/import_openrouter_csv.py
Requires: pip install supabase python-dotenv
"""

import csv
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_PROJECT_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

CSV_FILES = [
    "16 jan to 15 feb.csv",
    "15 feb to 15 march.csv",
]

SERVICE_MAP = {
    "LP_Shujaan_Testing": "Lesson Plan",
    "Exam Gen Key": "Exam Generation",
}

def parse_row(row):
    return {
        "generation_id":      row["generation_id"],
        "created_at":         row["created_at"],
        "cost_total":         float(row["cost_total"]) if row["cost_total"] else None,
        "tokens_prompt":      int(row["tokens_prompt"]) if row["tokens_prompt"] else None,
        "tokens_completion":  int(row["tokens_completion"]) if row["tokens_completion"] else None,
        "tokens_reasoning":   int(row["tokens_reasoning"]) if row["tokens_reasoning"] else None,
        "tokens_cached":      int(row["tokens_cached"]) if row["tokens_cached"] else None,
        "model":              row["model_permaslug"] or None,
        "provider":           row["provider_name"] or None,
        "app_name":           row["app_name"] or None,
        "api_key_name":       row["api_key_name"] or None,
        "generation_time_ms": int(row["generation_time_ms"]) if row["generation_time_ms"] else None,
        "cancelled":          row["cancelled"].lower() == "true",
        "finish_reason":      row["finish_reason_normalized"] or None,
        "service":            SERVICE_MAP.get(row["api_key_name"], "Unknown"),
    }

def main():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = []

    for fname in CSV_FILES:
        with open(fname, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(parse_row(row))

    print(f"Importing {len(rows)} rows...")

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        result = client.table("openrouter_logs").upsert(batch).execute()
        print(f"  Inserted rows {i+1}–{min(i+batch_size, len(rows))}")

    print("Done.")

if __name__ == "__main__":
    main()
