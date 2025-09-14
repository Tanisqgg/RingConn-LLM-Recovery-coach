# app/server.py
from __future__ import annotations
import os
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd

from . import DATA_DIR
from .coach_agent import run_chat, is_ollama_up, OLLAMA_MODEL
from .fit_sync import synchronize
from .anomaly_detector import load_segments, compute_daily_metrics
from .readiness_model import predict_today

# -----------------------------------
# Flask app
# -----------------------------------
app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/chat": {"origins": "*"}})

# Where the React build will land (vite build -> frontend/build)
FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend" / "build"

# -----------------------------------
# API: model status (for the top pill)
# -----------------------------------
@app.get("/api/model")
def api_model():
    up, models = is_ollama_up()
    return jsonify({
        "ollama": {
            "reachable": bool(up),
            "configured": bool(OLLAMA_MODEL),
            "model": OLLAMA_MODEL or "",
            "available": sorted(list(models)),
        }
    })

# -----------------------------------
# API: Fit — HR last 7 days
# Expect hr_daily.csv with columns: date, avg_bpm, min_bpm, max_bpm
# -----------------------------------
@app.get("/api/fit/hr/last7")
def api_hr_last7():
    p = DATA_DIR / "hr_daily.csv"
    if not p.exists():
        return jsonify({"data": []})
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    recs = []
    for _, r in df.iterrows():
        recs.append({
            "date": str(pd.to_datetime(r["date"]).date()),
            "avg_bpm": (float(r["avg_bpm"]) if pd.notna(r.get("avg_bpm")) else None),
            "min_bpm": (float(r["min_bpm"]) if pd.notna(r.get("min_bpm")) else None),
            "max_bpm": (float(r["max_bpm"]) if pd.notna(r.get("max_bpm")) else None),
        })
    return jsonify({"data": recs})

# -----------------------------------
# API: Fit — HR intraday (5-min buckets)
# Expect hr_intraday.csv with columns: ts, avg_bpm, min_bpm, max_bpm
# -----------------------------------
@app.get("/api/fit/hr/intraday")
def api_hr_intraday():
    p = DATA_DIR / "hr_intraday.csv"
    if not p.exists():
        return jsonify({"samples": []})
    df = pd.read_csv(p)
    if df.empty:
        return jsonify({"samples": []})
    samples = []
    for _, r in df.iterrows():
        samples.append({
            "ts": r["ts"],
            "avg_bpm": (float(r["avg_bpm"]) if pd.notna(r.get("avg_bpm")) else None),
            "min_bpm": (float(r["min_bpm"]) if pd.notna(r.get("min_bpm")) else None),
            "max_bpm": (float(r["max_bpm"]) if pd.notna(r.get("max_bpm")) else None),
        })
    return jsonify({"samples": samples})

# -----------------------------------
# API: Fit — Steps last 7 days
# Expect steps_daily.csv with columns: date, steps
# -----------------------------------
@app.get("/api/fit/steps/last7")
def api_steps_last7():
    p = DATA_DIR / "steps_daily.csv"
    if not p.exists():
        return jsonify({"data": []})
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    recs = [{"date": str(pd.to_datetime(d).date()), "steps": int(s or 0)} for d, s in zip(df["date"], df["steps"].fillna(0))]
    return jsonify({"data": recs})

# -----------------------------------
# API: Fit — Calories last 7 days
# Expect calories_daily.csv with columns: date, kcal
# -----------------------------------
@app.get("/api/fit/calories/last7")
def api_calories_last7():
    p = DATA_DIR / "calories_daily.csv"
    if not p.exists():
        return jsonify({"data": []})
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    recs = [{"date": str(pd.to_datetime(d).date()), "kcal": float(k or 0.0)} for d, k in zip(df["date"], df["kcal"].fillna(0.0))]
    return jsonify({"data": recs})

# -----------------------------------
# API: Fit — Sleep debug (daily stage minutes)
# sleep_segments.csv -> compute_daily_metrics()
# Returns rows {date, stage, mins}
# -----------------------------------
@app.get("/api/debug/sleep")
def api_debug_sleep():
    segs = load_segments()
    if segs.empty:
        return jsonify({"data": []})
    daily = compute_daily_metrics(segs)
    if daily.empty:
        return jsonify({"data": []})
    rows: List[Dict[str, Any]] = []
    for _, r in daily.sort_values("date").iterrows():
        date = str(pd.to_datetime(r["date"]).date())
        for stage in ["Light sleep", "Deep sleep", "REM sleep", "Awake (during sleep)"]:
            val = float(r.get(stage, 0.0) or 0.0)
            rows.append({"date": date, "stage": stage, "mins": val})
    return jsonify({"data": rows})

# -----------------------------------
# API: Sync Google Fit (writes CSVs)
# -----------------------------------
@app.post("/api/fit/sync")
def api_fit_sync():
    try:
        out = synchronize()  # Uses your updated fit_sync.synchronize
        return jsonify({"message": "Sync complete", "files": out})
    except Exception as e:
        return jsonify({"error": f"sync failed: {e}"}), 500

# -----------------------------------
# Chat (text + optional viz spec)
# -----------------------------------
@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    user_msg = str(payload.get("message", "")).strip()
    try:
        reply, viz = run_chat(user_msg)  # (text, Chart.js-like spec or None)
        out: Dict[str, Any] = {"response": reply}
        if viz:
            out["viz"] = viz
        return jsonify(out)
    except Exception as e:
        return jsonify({"error": f"chat failed: {e}"}), 500

# -----------------------------------
# Serve React build in production
# -----------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    # Don't catch API/chat/media paths
    if path.startswith(("api", "chat", "media")):
        return jsonify({"error": "not found"}), 404
    if not FRONTEND_DIR.exists():
        return "Frontend build not found. Run the React build (see docs).", 404
    file_path = FRONTEND_DIR / path
    if path and file_path.exists():
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")

# -----------------------------------

def _get_daily_timeseries() -> list[DailyRow]:
    """
    TODO: Replace with your actual data fetch (from fit_sync/db).
    Must return ascending by date with fields filled where available.
    """
    rows = []
    # Example scaffold – plug real fetch here:
    # for d in fetch_last_120_days():
    #     rows.append(DailyRow(
    #         date=d["date"], readiness=d.get("readiness"),
    #         rhr=d.get("resting_hr"), hrv=d.get("hrv_rmssd"),
    #         sleep_total_min=d.get("sleep_total_min"),
    #         sleep_deep_min=d.get("sleep_deep_min"),
    #         sleep_rem_min=d.get("sleep_rem_min"),
    #         activity_min=d.get("moderate_vigorous_min"),
    #         steps=d.get("steps"),
    #         temp_dev_c=d.get("temp_deviation_c"),
    #     ))
    return rows

@app.get("/api/readiness/predict")
def readiness_predict():
    hist = _get_daily_timeseries()
    result = predict_today(hist)
    return jsonify(result)
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)