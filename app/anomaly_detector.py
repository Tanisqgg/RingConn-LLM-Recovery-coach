# app/anomaly_detector.py
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import numpy as np

from . import DATA_DIR

SEGMENTS_CSV = DATA_DIR / "sleep_segments.csv"
BASELINE_CSV = DATA_DIR / "metrics_baseline.csv"

# Sleep between 18:00 and next-day 18:00 is assigned to the previous date.
NIGHT_ANCHOR_HOUR = 18  # local-evening anchor

# Default composition used only when granular stages are missing
DEFAULT_STAGE_WEIGHTS = {
    "Light sleep": 0.60,
    "Deep sleep": 0.18,
    "REM sleep": 0.22,
}

GRANULAR = ["Light sleep", "Deep sleep", "REM sleep", "Awake (during sleep)"]
ALL_COLS = GRANULAR + ["Sleep"]


def _canonical_stage(name: str) -> Optional[str]:
    if not isinstance(name, str):
        return None
    n = name.strip().lower()
    if "light" in n: return "Light sleep"
    if "deep" in n:  return "Deep sleep"
    if "rem"  in n:  return "REM sleep"
    if "awake" in n: return "Awake (during sleep)"
    if n == "sleep": return "Sleep"
    return None


def load_segments() -> pd.DataFrame:
    """
    Load segments written by the Google Fit sync.
    Columns: start, end, stage.
    Returns parsed datetimes + canonical 'stage' + duration mins + 'night' bucket.
    """
    if not SEGMENTS_CSV.exists():
        return pd.DataFrame(columns=["start", "end", "stage"])

    df = pd.read_csv(SEGMENTS_CSV)
    if df.empty:
        return df

    df["start"] = pd.to_datetime(df["start"], errors="coerce", utc=True)
    df["end"]   = pd.to_datetime(df["end"],   errors="coerce", utc=True)
    df["stage"] = df["stage"].map(_canonical_stage)
    df = df.dropna(subset=["start", "end", "stage"])
    df = df[df["end"] > df["start"]]  # drop zero/negative durations

    df["mins"]  = (df["end"] - df["start"]).dt.total_seconds() / 60.0
    df["night"] = (df["start"] - pd.Timedelta(hours=NIGHT_ANCHOR_HOUR)).dt.date
    return df[["start", "end", "stage", "mins", "night"]].sort_values(["start"])


def compute_daily_metrics(segments: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Per-night totals:
      Light/Deep/REM minutes, Awake (during sleep), and Sleep (= Light+Deep+REM).
    - Stage minutes NEVER include the generic 'Sleep' envelope to avoid double counting.
    - If a night has a 'Sleep' envelope but some stages are missing, allocate the
      remaining minutes across the missing stages using DEFAULT_STAGE_WEIGHTS.
    """
    df = segments.copy() if segments is not None else load_segments()
    if df is None or df.empty:
        return pd.DataFrame(columns=["date"] + ALL_COLS)

    container = df[df["stage"] == "Sleep"].groupby("night")["mins"].sum()
    awake     = df[df["stage"] == "Awake (during sleep)"].groupby("night")["mins"].sum()

    stage_df = df[df["stage"].isin(["Light sleep", "Deep sleep", "REM sleep", "Awake (during sleep)"])]
    stage_totals = stage_df.groupby(["night", "stage"])["mins"].sum().unstack(fill_value=0.0)

    nights: List[pd.Timestamp] = sorted(list(set(df["night"])))
    rows: List[Dict[str, float]] = []

    for night in nights:
        light = float(stage_totals.get("Light sleep", {}).get(night, 0.0) or 0.0)
        deep  = float(stage_totals.get("Deep sleep",  {}).get(night, 0.0) or 0.0)
        rem   = float(stage_totals.get("REM sleep",   {}).get(night, 0.0) or 0.0)
        a     = float(awake.get(night, 0.0) or 0.0)

        measured = light + deep + rem
        target_restful = float(container.get(night, 0.0) or 0.0) - a
        if target_restful < 0:
            target_restful = measured  # fallback

        if target_restful > 0 and measured == 0:
            # No granular data at all -> use defaults entirely
            light = target_restful * DEFAULT_STAGE_WEIGHTS["Light sleep"]
            deep  = target_restful * DEFAULT_STAGE_WEIGHTS["Deep sleep"]
            rem   = target_restful * DEFAULT_STAGE_WEIGHTS["REM sleep"]
        elif target_restful > 0 and measured < target_restful - 1e-6:
            remainder = target_restful - measured
            missing = [s for s, v in [("Light sleep", light), ("Deep sleep", deep), ("REM sleep", rem)] if v <= 0.0]
            if missing:
                total_w = sum(DEFAULT_STAGE_WEIGHTS[s] for s in missing)
                for s in missing:
                    add = remainder * (DEFAULT_STAGE_WEIGHTS[s] / max(total_w, 1e-9))
                    if s == "Light sleep": light += add
                    elif s == "Deep sleep": deep += add
                    else: rem += add
            else:
                # If all have some minutes, put remainder in Light sleep
                light += remainder

        sleep_total = max(0.0, light + deep + rem)

        rows.append({
            "date": pd.to_datetime(night),
            "Light sleep": light,
            "Deep sleep": deep,
            "REM sleep": rem,
            "Awake (during sleep)": a,
            "Sleep": sleep_total,
        })

    daily = pd.DataFrame(rows).sort_values("date")

    # Keep a rolling baseline for anomaly detection (safe to ignore if not used)
    try:
        base = pd.read_csv(BASELINE_CSV, parse_dates=["date"]) if BASELINE_CSV.exists() else pd.DataFrame()
        base = pd.concat([base, daily], ignore_index=True).drop_duplicates(subset=["date"]).sort_values("date")
        base.to_csv(BASELINE_CSV, index=False)
    except Exception:
        pass

    return daily


def flag_anomalies(base: pd.DataFrame) -> Tuple[pd.Timestamp, Dict[str, Dict[str, float]]]:
    """Flag stages that are unusually LOW vs 7-day rolling mean."""
    if base is None or base.empty or "date" not in base.columns:
        return pd.Timestamp.now().date(), {}
    today = base["date"].max()
    hist = base[base["date"] < today].set_index("date")
    today_vals = base[base["date"] == today].set_index("date")
    flags: Dict[str, Dict[str, float]] = {}
    if hist.empty or today_vals.empty or len(hist) < 3:
        return pd.to_datetime(today).date(), flags

    for col in ["REM sleep", "Deep sleep", "Light sleep", "Awake (during sleep)"]:
        if col not in hist.columns:
            continue
        s = hist[col].dropna()
        if len(s) < 3:
            continue
        mu = float(s.rolling(7, min_periods=3).mean().iloc[-1])
        sd = float(s.rolling(7, min_periods=3).std().iloc[-1])
        if col in today_vals.columns:
            today_v = float(today_vals[col].iat[0])
            if sd > 0 and today_v < mu - 1.5 * sd:
                flags[col] = {"today": today_v, "baseline": mu, "std": sd}
    return pd.to_datetime(today).date(), flags