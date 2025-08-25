from __future__ import annotations
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import os
from datetime import datetime, timedelta, timezone

import pandas as pd
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

from . import DATA_DIR

# Expanded scopes to include activity (steps & calories)
SCOPES = [
    "https://www.googleapis.com/auth/fitness.sleep.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.activity.read",
]
CREDENTIALS_FILE = DATA_DIR.parent / "credentials.json"
TOKEN_FILE = DATA_DIR / "token.json"

STAGE_MAP = {
    0: "Unused",
    1: "Awake (during sleep)",
    2: "Sleep",
    3: "Out-of-bed",
    4: "Light sleep",
    5: "Deep sleep",
    6: "REM sleep",
}

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
    LOCAL_TZ = ZoneInfo(os.getenv("APP_TZ", "America/Chicago"))
except Exception:
    # Fallback if zoneinfo unavailable
    from tzlocal import get_localzone
    LOCAL_TZ = get_localzone()

def _local_midnights(days_back: int):
    """Return (start_utc, end_utc) that align to local midnight windows."""
    now_local = datetime.now(tz=LOCAL_TZ)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_back)
    end_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)

def get_credentials() -> Credentials:
    creds: Optional[Credentials] = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not Path(CREDENTIALS_FILE).exists():
                raise FileNotFoundError(f"Missing {CREDENTIALS_FILE}. Download OAuth client JSON.")
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return creds

def _pick_merged_stream(sources: List[Dict[str, Any]], dtype: str, merge_suffix: str) -> Optional[str]:
    for ds in sources:
        if ds.get("dataType", {}).get("name") == dtype:
            sid = ds.get("dataStreamId")
            if sid and sid.startswith("derived:") and sid.endswith(merge_suffix):
                return sid
    for ds in sources:
        if ds.get("dataType", {}).get("name") == dtype and "dataStreamId" in ds:
            return ds["dataStreamId"]
    return None

def _decode_stage(val_list: list) -> str:
    try:
        code = int(val_list[0].get("intVal"))
        return STAGE_MAP.get(code, f"Unknown({code})")
    except Exception:
        return "Unknown(?)"

def fetch_sleep_segments(service, days_window: int = 3) -> pd.DataFrame:
    """
    Fetch sleep segments using Google's merged stream and union across *all* sleep sessions
    within a wide local window to capture nights that cross midnight.
    Returns columns: start (UTC), end (UTC), stage (string).
    """
    import pandas as pd

    # Wide window to catch late-evening and early-morning parts of "last night"
    start_utc, end_utc = _local_midnights(days_window)

    # Prefer merged sleep-segment stream
    sources = service.users().dataSources().list(userId="me").execute().get("dataSource", [])
    sleep_stream = _pick_merged_stream(sources, "com.google.sleep.segment", "merge_sleep_segments")

    def _get_points_for_range(s_ms: int, e_ms: int):
        ds_id = f"{s_ms * 1_000_000}-{e_ms * 1_000_000}"  # ns
        resp = service.users().dataSources().datasets().get(
            userId="me", dataSourceId=sleep_stream, datasetId=ds_id
        ).execute() if sleep_stream else {}
        return resp.get("point", [])

    # Collect sessions of type 72 (sleep) in the wide window
    sess = service.users().sessions().list(
        userId="me",
        startTime=start_utc.isoformat(),
        endTime=end_utc.isoformat(),
        activityType=72
    ).execute()
    sessions = sess.get("session", []) or []

    points = []
    if sessions:
        for s in sessions:
            s_ms = int(s.get("startTimeMillis"))
            e_ms = int(s.get("endTimeMillis"))
            points.extend(_get_points_for_range(s_ms, e_ms))
    else:
        # Fallback: just pull the whole wide window
        s_ms = int(start_utc.timestamp() * 1000)
        e_ms = int(end_utc.timestamp() * 1000)
        points = _get_points_for_range(s_ms, e_ms)

    if not points:
        return pd.DataFrame(columns=["start", "end", "stage"])

    df = pd.json_normalize(points)
    # Convert times and map stages
    df["start"] = pd.to_datetime(df["startTimeNanos"].astype("int64"), unit="ns", utc=True)
    df["end"]   = pd.to_datetime(df["endTimeNanos"].astype("int64"),   unit="ns", utc=True)
    df["stage"] = df["value"].apply(_decode_stage)

    # De-dupe identical segments
    df = df.drop_duplicates(subset=["start", "end", "stage"]).reset_index(drop=True)

    # If granular stages exist for a local day, drop generic "Sleep" rows for that same day
    df["date_local"] = df["start"].dt.tz_convert(LOCAL_TZ).dt.date
    granular = {"Light sleep", "Deep sleep", "REM sleep", "Awake (during sleep)"}
    has_granular = df.groupby("date_local")["stage"].transform(lambda s: s.isin(granular).any())
    df = df[~(has_granular & df["stage"].eq("Sleep"))].copy()
    df = df.drop(columns=["date_local"])

    return df[["start", "end", "stage"]]

def _aggregate(service, aggregate_by: Dict[str, Any], start: datetime, end: datetime, bucket_ms: int) -> Dict[str, Any]:
    body = {
        "aggregateBy": [aggregate_by],
        "bucketByTime": {"durationMillis": int(bucket_ms)},
        "startTimeMillis": int(start.timestamp() * 1000),
        "endTimeMillis": int(end.timestamp() * 1000),
    }
    return service.users().dataset().aggregate(userId="me", body=body).execute()

def fetch_hr_daily(service, days: int = 7) -> pd.DataFrame:
    """
    Daily heart-rate summary aligned to local midnights.
    Returns: date (local), avg_bpm (float|None), min_bpm (float|None), max_bpm (float|None)
    """
    import pandas as pd

    start_utc, end_utc = _local_midnights(days)

    # Prefer merged HR stream
    try:
        sources = service.users().dataSources().list(userId="me").execute().get("dataSource", [])
        merged_hr = _pick_merged_stream(sources, "com.google.heart_rate.bpm", "merge_heart_rate_bpm")
    except Exception:
        merged_hr = None

    agg_by = {"dataTypeName": "com.google.heart_rate.bpm"}
    if merged_hr:
        agg_by["dataSourceId"] = merged_hr

    agg = _aggregate(service, agg_by, start_utc, end_utc, bucket_ms=24 * 3600 * 1000)

    rows = []
    for b in agg.get("bucket", []):
        s_ms = int(b.get("startTimeMillis", 0) or 0)
        date_local = (
            pd.to_datetime(s_ms, unit="ms", utc=True)
              .tz_convert(LOCAL_TZ)
              .date()
        )
        avg = minv = maxv = None
        for ds in b.get("dataset", []):
            for p in ds.get("point", []):
                vals = p.get("value", [])
                # Google typically returns: [avg, max, min] as fpVal (when available)
                if len(vals) >= 1 and "fpVal" in vals[0]:
                    avg = float(vals[0]["fpVal"])
                if len(vals) >= 2 and "fpVal" in vals[1]:
                    maxv = float(vals[1]["fpVal"])
                if len(vals) >= 3 and "fpVal" in vals[2]:
                    minv = float(vals[2]["fpVal"])
        rows.append({"date": date_local, "avg_bpm": avg, "min_bpm": minv, "max_bpm": maxv})

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values("date").reset_index(drop=True)
    return df

def fetch_hr_intraday(service, hours: int = 24, bucket_min: int = 5) -> pd.DataFrame:
    """
    Intraday HR over a rolling window (default 24h), bucketed by `bucket_min` minutes.
    Returns: ts (ISO in LOCAL_TZ), avg_bpm, min_bpm, max_bpm
    """
    import pandas as pd

    now_utc = datetime.now(timezone.utc)
    start_utc = now_utc - timedelta(hours=hours)

    # Prefer merged HR stream
    try:
        sources = service.users().dataSources().list(userId="me").execute().get("dataSource", [])
        merged_hr = _pick_merged_stream(sources, "com.google.heart_rate.bpm", "merge_heart_rate_bpm")
    except Exception:
        merged_hr = None

    agg_by = {"dataTypeName": "com.google.heart_rate.bpm"}
    if merged_hr:
        agg_by["dataSourceId"] = merged_hr

    agg = _aggregate(service, agg_by, start_utc, now_utc, bucket_ms=bucket_min * 60 * 1000)

    rows = []
    for b in agg.get("bucket", []):
        s_ms = int(b.get("startTimeMillis", 0) or 0)
        ts_local = (
            pd.to_datetime(s_ms, unit="ms", utc=True)
              .tz_convert(LOCAL_TZ)
              .isoformat()
        )
        avg = minv = maxv = None
        for ds in b.get("dataset", []):
            for p in ds.get("point", []):
                vals = p.get("value", [])
                if len(vals) >= 1 and "fpVal" in vals[0]:
                    avg = float(vals[0]["fpVal"])
                if len(vals) >= 2 and "fpVal" in vals[1]:
                    maxv = float(vals[1]["fpVal"])
                if len(vals) >= 3 and "fpVal" in vals[2]:
                    minv = float(vals[2]["fpVal"])
        rows.append({"ts": ts_local, "avg_bpm": avg, "min_bpm": minv, "max_bpm": maxv})

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values("ts").reset_index(drop=True)
    return df

def fetch_steps_daily(service, days: int = 7) -> pd.DataFrame:
    """
    Return a per-day step count DataFrame for the last `days` days, where each day is
    anchored to *local* midnight (to match the Google Fit app's day boundaries).

    Requires the following to exist in this module:
      - LOCAL_TZ (timezone) and _local_midnights(days) -> (start_utc, end_utc)
      - _pick_merged_stream(sources, dtype, merge_suffix) -> str|None
      - _aggregate(service, aggregate_by, start_dt, end_dt, bucket_ms) -> dict

    Output columns:
      - date: datetime.date (local calendar day)
      - steps: int (total steps for that local day)
    """
    # Figure out local-day window [start_of_day_N_days_ago .. end_of_today]
    start_utc, end_utc = _local_midnights(days)

    # Prefer Google's merged step stream (phone + watch + apps) if available.
    try:
        sources = service.users().dataSources().list(userId="me").execute().get("dataSource", [])
        merged_steps = _pick_merged_stream(
            sources,
            dtype="com.google.step_count.delta",
            merge_suffix="merge_step_deltas"
        )
    except Exception:
        merged_steps = None

    agg_by = {"dataTypeName": "com.google.step_count.delta"}
    if merged_steps:
        agg_by["dataSourceId"] = merged_steps  # ensures de-duped, merged steps like the Fit app

    # One bucket per local day
    agg = _aggregate(service, agg_by, start_utc, end_utc, bucket_ms=24 * 3600 * 1000)

    rows = []
    for b in agg.get("bucket", []):
        s_ms = int(b.get("startTimeMillis", 0) or 0)

        # Label each bucket by the local calendar date at its start
        date_local = (
            pd.to_datetime(s_ms, unit="ms", utc=True)
              .tz_convert(LOCAL_TZ)
              .date()
        )

        total_steps = 0
        for ds in b.get("dataset", []):
            for p in ds.get("point", []):
                # Steps can arrive as intVal (usual) or fpVal (rare). Coerce either.
                vlist = p.get("value", [])
                if not vlist:
                    continue
                v = vlist[0]
                iv = v.get("intVal")
                fv = v.get("fpVal")
                if iv is not None:
                    total_steps += int(iv)
                elif fv is not None:
                    total_steps += int(round(float(fv)))

        rows.append({"date": date_local, "steps": int(total_steps)})

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values("date").reset_index(drop=True)

    return df

def fetch_calories_daily(service, days: int = 7, mode: str = "total") -> pd.DataFrame:
    """
    Daily calories aligned to local midnights.
    mode: "total" (default) returns com.google.calories.expended totals.
          "active" attempts to subtract basal (if available) to approximate active calories.
    Returns: date (local date), kcal (float)
    """
    import pandas as pd

    start_utc, end_utc = _local_midnights(days)

    # Prefer merged calories stream
    try:
        sources = service.users().dataSources().list(userId="me").execute().get("dataSource", [])
        merged_cal = _pick_merged_stream(sources, "com.google.calories.expended", "merge_calories_expended")
    except Exception:
        merged_cal = None

    agg_by_total = {"dataTypeName": "com.google.calories.expended"}
    if merged_cal:
        agg_by_total["dataSourceId"] = merged_cal

    total_agg = _aggregate(service, agg_by_total, start_utc, end_utc, bucket_ms=24 * 3600 * 1000)
    total_rows = []
    for b in total_agg.get("bucket", []):
        s_ms = int(b.get("startTimeMillis", 0) or 0)
        date_local = (
            pd.to_datetime(s_ms, unit="ms", utc=True)
              .tz_convert(LOCAL_TZ)
              .date()
        )
        kcal = 0.0
        for ds in b.get("dataset", []):
            for p in ds.get("point", []):
                vlist = p.get("value", [])
                if not vlist:
                    continue
                v = vlist[0]
                if "fpVal" in v:
                    kcal += float(v["fpVal"])
        total_rows.append({"date": date_local, "kcal": float(kcal)})
    total_df = pd.DataFrame(total_rows).groupby("date", as_index=False).sum()

    if mode != "active":
        return total_df.sort_values("date").reset_index(drop=True)

    # Attempt to subtract basal to approximate Active calories
    try:
        basal_agg = _aggregate(
            service,
            {"dataTypeName": "com.google.basal_metabolic_rate"},
            start_utc, end_utc, bucket_ms=24 * 3600 * 1000
        )
        basal_rows = []
        for b in basal_agg.get("bucket", []):
            s_ms = int(b.get("startTimeMillis", 0) or 0)
            date_local = (
                pd.to_datetime(s_ms, unit="ms", utc=True)
                  .tz_convert(LOCAL_TZ)
                  .date()
            )
            basal_kcal = 0.0
            for ds in b.get("dataset", []):
                for p in ds.get("point", []):
                    vlist = p.get("value", [])
                    if not vlist:
                        continue
                    v = vlist[0]
                    # BMR is often a rate; in aggregate buckets Google typically gives daily total already.
                    if "fpVal" in v:
                        basal_kcal += float(v["fpVal"])
            basal_rows.append({"date": date_local, "basal_kcal": float(basal_kcal)})
        basal_df = pd.DataFrame(basal_rows).groupby("date", as_index=False).sum()

        out = total_df.merge(basal_df, on="date", how="left").fillna({"basal_kcal": 0.0})
        out["kcal"] = (out["kcal"] - out["basal_kcal"]).clip(lower=0.0)
        return out[["date", "kcal"]].sort_values("date").reset_index(drop=True)
    except Exception:
        # If basal not available, fall back to Total
        return total_df.sort_values("date").reset_index(drop=True)

def synchronize(
    days_for_hr: int = 7,
    days_for_activity: int = 7,
    hr_intraday_hours: int = 24,
    hr_intraday_bucket_min: int = 5,
    sleep_days_window: int = 3,           # wide window to capture nights crossing midnight
    calories_mode: str = "total",         # or "active" to subtract basal if available
) -> dict:
    """
    Pulls data from Google Fit and writes CSVs under DATA_DIR.

    Produces:
      - sleep_segments.csv     (sleep segments across a wide local window)
      - hr_daily.csv           (daily avg/min/max HR; local-midnight buckets)
      - hr_intraday.csv        (5-min HR buckets for last N hours)
      - steps_daily.csv        (daily steps; local-midnight buckets)
      - calories_daily.csv     (daily calories; local-midnight buckets; total or active)
    Returns a dict of file paths.
    """
    from pathlib import Path
    import pandas as pd
    from googleapiclient.discovery import build

    # Ensure data dir exists
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)

    # Auth + service
    creds = get_credentials()
    service = build("fitness", "v1", credentials=creds, cache_discovery=False)

    # ---- Sleep (use new signature: days_window) ----
    try:
        df_sleep = fetch_sleep_segments(service, days_window=sleep_days_window)
    except TypeError:
        # In case an older version still expects (service, start, end), fall back gracefully
        from datetime import datetime, timedelta, timezone
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=sleep_days_window)
        df_sleep = fetch_sleep_segments(service, start, end)  # legacy call

    (DATA_DIR / "sleep_segments.csv").write_text(
        (df_sleep if isinstance(df_sleep, pd.DataFrame) else pd.DataFrame()).to_csv(index=False),
        encoding="utf-8"
    )

    # ---- HR daily (local-midnight buckets) ----
    df_hr = fetch_hr_daily(service, days=days_for_hr)
    (DATA_DIR / "hr_daily.csv").write_text(
        (df_hr if isinstance(df_hr, pd.DataFrame) else pd.DataFrame()).to_csv(index=False),
        encoding="utf-8"
    )

    # ---- HR intraday (rolling window) ----
    df_hr_intra = fetch_hr_intraday(service, hours=hr_intraday_hours, bucket_min=hr_intraday_bucket_min)
    (DATA_DIR / "hr_intraday.csv").write_text(
        (df_hr_intra if isinstance(df_hr_intra, pd.DataFrame) else pd.DataFrame()).to_csv(index=False),
        encoding="utf-8"
    )

    # ---- Steps daily (local-midnight buckets) ----
    df_steps = fetch_steps_daily(service, days=days_for_activity)
    (DATA_DIR / "steps_daily.csv").write_text(
        (df_steps if isinstance(df_steps, pd.DataFrame) else pd.DataFrame()).to_csv(index=False),
        encoding="utf-8"
    )

    # ---- Calories daily (local-midnight buckets) ----
    df_kcal = fetch_calories_daily(service, days=days_for_activity, mode=calories_mode)
    (DATA_DIR / "calories_daily.csv").write_text(
        (df_kcal if isinstance(df_kcal, pd.DataFrame) else pd.DataFrame()).to_csv(index=False),
        encoding="utf-8"
    )

    return {
        "sleep_segments": str(DATA_DIR / "sleep_segments.csv"),
        "hr_daily":       str(DATA_DIR / "hr_daily.csv"),
        "hr_intraday":    str(DATA_DIR / "hr_intraday.csv"),
        "steps_daily":    str(DATA_DIR / "steps_daily.csv"),
        "calories_daily": str(DATA_DIR / "calories_daily.csv"),
    }