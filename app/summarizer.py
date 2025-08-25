# app/summarizer.py
from __future__ import annotations
from typing import List, Dict, Any, Tuple
from pathlib import Path
from datetime import datetime

import json
import pandas as pd

from . import DATA_DIR
from .anomaly_detector import load_segments, compute_daily_metrics, flag_anomalies


SUMMARIES_PATH = DATA_DIR / "coach_summaries.jsonl"


def _fmt_minutes(m: float) -> str:
    m = float(m or 0.0)
    h = int(m // 60)
    r = int(round(m % 60))
    return f"{h} h {r} min" if h else f"{r} min"


def _rolling_avg(series: pd.Series, k: int = 7) -> float:
    s = series.dropna().astype(float)
    if s.empty:
        return 0.0
    if len(s) < k:
        return float(s.mean())
    return float(s.rolling(k, min_periods=3).mean().iloc[-1])


def generate_coach_messages() -> Tuple[str, List[str]]:
    """
    Build a short, data-driven summary for the most recent night.
    Returns (date_iso, [bullets])
    """
    segs = load_segments()
    if segs is None or segs.empty:
        today = datetime.today().date().isoformat()
        return today, ["I don’t have sleep segments yet—try Sync Google Fit and ask again."]

    daily = compute_daily_metrics(segs)
    if daily is None or daily.empty:
        today = datetime.today().date().isoformat()
        return today, ["I couldn’t compute nightly sleep metrics from your segments yet."]

    daily = daily.sort_values("date")
    last = daily.iloc[-1]
    last_date = pd.to_datetime(last["date"]).date().isoformat()

    # Totals (using corrected logic from anomaly_detector)
    light = float(last.get("Light sleep", 0.0))
    deep  = float(last.get("Deep sleep",  0.0))
    rem   = float(last.get("REM sleep",   0.0))
    awake = float(last.get("Awake (during sleep)", 0.0))
    sleep_total = float(last.get("Sleep", light + deep + rem))

    msgs: List[str] = [
        f"Total sleep: {_fmt_minutes(sleep_total)} "
        f"(Light {int(round(light))}m, Deep {int(round(deep))}m, REM {int(round(rem))}m)."
    ]
    if awake > 0:
        msgs.append(f"Awake during sleep: {int(round(awake))} min.")

    # Compare to recent baseline (last 7 days rolling)
    hist = daily.iloc[:-1] if len(daily) > 1 else pd.DataFrame()
    if not hist.empty:
        base_sleep = _rolling_avg(hist["Sleep"], 7)
        delta = sleep_total - base_sleep
        if abs(delta) >= 15:
            direction = "↑" if delta > 0 else "↓"
            msgs.append(
                f"Compared to your 7-day average ({_fmt_minutes(base_sleep)}), last night was {direction}{abs(int(round(delta)))} min."
            )

    # Stage anomalies (low vs rolling baseline)
    _, flags = flag_anomalies(daily)
    for stage, info in flags.items():
        today_v = int(round(info["today"]))
        base_v  = int(round(info["baseline"]))
        msgs.append(f"{stage} was low vs baseline ({today_v}m vs ~{base_v}m).")

    # Sleep composition hint
    if sleep_total > 0:
        pct_deep = 100.0 * deep / sleep_total
        pct_rem  = 100.0 * rem  / sleep_total
        if pct_deep < 12:
            msgs.append("Deep sleep on the lower side — earlier wind-down and a cooler room can help.")
        if pct_rem < 18:
            msgs.append("REM was modest — keep a consistent bedtime and avoid late heavy meals.")

    return last_date, msgs


def save_messages(date_iso: str, messages: List[str]) -> Path:
    """
    Append a JSON line with the summary so the coach/memory can reuse it.
    """
    SUMMARIES_PATH.parent.mkdir(parents=True, exist_ok=True)
    rec = {"date": date_iso, "message": " ".join(messages), "messages": messages}
    with open(SUMMARIES_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return SUMMARIES_PATH