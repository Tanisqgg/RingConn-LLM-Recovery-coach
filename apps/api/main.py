from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import os, pandas as pd
from datetime import datetime
from summarizer import generate_coach_messages
from anomaly_detector import load_segments, compute_daily_metrics
from pydantic import BaseModel

DATA_DIR = os.getenv("DATA_DIR", "data")
SEG_PATH = os.path.join(DATA_DIR, "sleep_segments.csv")
HR_PATH  = os.path.join(DATA_DIR, "heart_rate_night.csv")  # optional

app = FastAPI(title="RingCoach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

class StageSegment(BaseModel):
    start: str
    end: str
    stage: str

@app.get("/health")
def health(): return {"ok": True}

@app.get("/sleep/segments", response_model=List[StageSegment])
def sleep_segments():
    df = pd.read_csv(SEG_PATH, parse_dates=["start","end"])
    return [
        {"start": r.start.isoformat(), "end": r.end.isoformat(), "stage": r.stage}
        for r in df.itertuples()
    ]

@app.get("/sleep/summary")
def sleep_summary():
    segs = load_segments()  # reads SEG_PATH
    daily = compute_daily_metrics(segs)
    today = daily.iloc[-1]  # latest row
    stages = {c: float(today[c]) for c in daily.columns if c not in ("date",)}
    total = sum(stages.values())
    score = int(round(
        100 * (
            0.35*(stages.get("Deep sleep",0)/90) +
            0.35*(stages.get("REM sleep",0)/100) +
            0.20*(total/450) +
            0.10*0.91/0.92
        )
    ))
    return {
        "date": pd.to_datetime(today["date"]).date().isoformat(),
        "totalMinutes": round(total),
        "efficiency": 0.91,
        "score": max(0, min(100, score)),
        "stages": stages
    }

@app.get("/hr/night")
def hr_night():
    if not os.path.exists(HR_PATH):
        return []
    df = pd.read_csv(HR_PATH, parse_dates=["t"])
    return [{"t": r.t.isoformat(), "bpm": int(r.bpm)} for r in df.itertuples()]

@app.get("/coach/messages")
def coach_messages():
    _, messages = generate_coach_messages()
    return [{"text": m} for m in messages]