#!/usr/bin/env python3
"""
extract_2025_data.py
────────────────────
Extracts 2025 data from the full NIFTY CSV for lightweight demo usage.

Usage:  python extract_2025_data.py
Output: data/NIFTY_1MIN_2025.csv
"""

import pandas as pd
import os

INPUT_FILE  = "data/NIFTY_1MIN_2015_2025.csv"
OUTPUT_FILE = "data/NIFTY_1MIN_2025_3MONTHS.csv"

print(f"📊 Loading {INPUT_FILE}...")
df = pd.read_csv(INPUT_FILE)

# Parse datetime column
dt_col = df.columns[0]  # 'Datetime'
df[dt_col] = pd.to_datetime(df[dt_col])

# Filter to 2025 and beyond
df_2025 = df[df[dt_col].dt.year >= 2025].copy()

# Get the first 3 months of data from 2025
if len(df_2025) > 0:
    df_2025 = df_2025.sort_values(by=dt_col)
    min_date = df_2025[dt_col].min()
    max_date = min_date + pd.DateOffset(months=3)
    df_2025 = df_2025[df_2025[dt_col] <= max_date]


# Save
os.makedirs("data", exist_ok=True)
df_2025.to_csv(OUTPUT_FILE, index=False)

print(f"✅ Extracted {len(df_2025):,} rows (first 3 months of 2025) → {OUTPUT_FILE}")
print(f"   Date range: {df_2025[dt_col].min()} → {df_2025[dt_col].max()}")
