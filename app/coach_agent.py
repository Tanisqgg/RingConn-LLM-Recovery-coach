from __future__ import annotations
import os
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Dict, Any

import requests
import pandas as pd

from .summarizer import generate_coach_messages, save_messages
from .memory import add_summaries_to_memory, query_memory
from .plotter import plot_weekly_pie
from .anomaly_detector import load_segments, compute_daily_metrics
from .benchmarks import (
    SLEEP_NEED_HOURS,
    STAGE_PCT_RANGES,
    RESTING_HR_ADULT_RANGE,
    ATHLETE_HR_RANGE,
)
from . import DATA_DIR

# -----------------------------
# Model / inference backends
# -----------------------------
OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "").strip()

DEFAULT_MODEL = os.getenv("COACH_MODEL", "tiiuae/falcon-7b-instruct")
FALLBACK_MODEL = os.getenv("COACH_MODEL_FALLBACK", "microsoft/Phi-3-mini-4k-instruct")
_hf_pipe = None
ENABLE_HF = os.getenv("ENABLE_HF", "0").strip() == "1"


def is_ollama_up() -> Tuple[bool, set]:
    """Check if Ollama endpoint is reachable and return available model names."""
    try:
        r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=5)
        if r.ok:
            tags = r.json().get("models", [])
            names = {m.get("name", "") for m in tags if m.get("name")}
            return True, names
    except Exception:
        pass
    return False, set()


def _ollama_model_available() -> bool:
    """True if Ollama is reachable and the configured model exists locally."""
    if not OLLAMA_MODEL:
        return False
    up, names = is_ollama_up()
    if not up:
        return False
    return OLLAMA_MODEL in names


# -----------------------------
# Simple data readers (for text replies)
# -----------------------------
def _read_hr_last7_list() -> List[str]:
    path = DATA_DIR / "hr_daily.csv"
    if not path.exists():
        return []
    df = pd.read_csv(path, parse_dates=["date"])
    if df.empty or "avg_bpm" not in df.columns:
        return []
    df = df.sort_values("date").tail(7)
    out = []
    for _, r in df.iterrows():
        d = r["date"].date()
        if pd.isna(r.get("avg_bpm")):
            out.append(f"{d}: n/a")
        else:
            s = f"{d}: {float(r['avg_bpm']):.0f} bpm"
            if (
                "min_bpm" in df.columns
                and "max_bpm" in df.columns
                and not pd.isna(r.get("min_bpm"))
                and not pd.isna(r.get("max_bpm"))
            ):
                s += f" ({float(r['min_bpm']):.0f}–{float(r['max_bpm']):.0f})"
            out.append(s)
    return out


def _read_steps_last7_list() -> List[str]:
    p = DATA_DIR / "steps_daily.csv"
    if not p.exists():
        return []
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    if df.empty or "steps" not in df.columns:
        return []
    return [f"{d.date()}: {int(s)} steps" for d, s in zip(df["date"], df["steps"].fillna(0))]


def _read_calories_last7_list() -> List[str]:
    p = DATA_DIR / "calories_daily.csv"
    if not p.exists():
        return []
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    if df.empty or "kcal" not in df.columns:
        return []
    return [f"{d.date()}: {float(k):.0f} kcal" for d, k in zip(df["date"], df["kcal"].fillna(0.0))]


def _read_intraday_hr_summary() -> str:
    p = DATA_DIR / "hr_intraday.csv"
    if not p.exists():
        return "No intraday heart-rate yet. Try syncing first."
    df = pd.read_csv(p)
    if df.empty or "avg_bpm" not in df.columns:
        return "No intraday heart-rate yet."
    s = df["avg_bpm"].dropna()
    if s.empty:
        return "No intraday heart-rate yet."
    return f"Today HR (5-min buckets): avg {s.mean():.0f} bpm, min {s.min():.0f}, max {s.max():.0f} (n={len(s)})."


def _read_hr_last7() -> str:
    vals = _read_hr_last7_list()
    if not vals:
        return "No heart-rate data found. Try syncing with Google Fit first."
    return "🫀 Last 7 days HR:\n" + "\n".join("• " + s for s in vals)


# -----------------------------
# Sleep + memory context
# -----------------------------
def _last_night_stage_minutes() -> str:
    segs = load_segments()
    if segs.empty:
        return "No sleep segments available."
    daily = compute_daily_metrics(segs)
    if daily.empty:
        return "No sleep segments available."
    last = daily.sort_values("date").iloc[-1]
    cols = ["REM sleep", "Deep sleep", "Light sleep", "Awake (during sleep)"]
    parts = [f"{c}: {float(last.get(c, 0.0)):.1f} min" for c in cols]
    return f"Last night ({pd.to_datetime(last['date']).date()}): " + ", ".join(parts)


def _memory_context(query_hint: str = "sleep") -> List[str]:
    res = query_memory(query_hint, k=5)
    return [f"{r['metadata'].get('date', '?')}: {r['message']}" for r in res]


def _context_pack() -> str:
    sections = []
    sections.append("== Latest Sleep ==")
    sections.append(_last_night_stage_minutes())
    sections.append("")
    sections.append("== Heart Rate (7d) ==")
    hr = _read_hr_last7_list()
    sections.extend(hr if hr else ["n/a"])
    sections.append("")
    sections.append("== Steps (7d) ==")
    steps = _read_steps_last7_list()
    sections.extend(steps if steps else ["n/a"])
    sections.append("")
    sections.append("== Calories (7d) ==")
    cal = _read_calories_last7_list()
    sections.extend(cal if cal else ["n/a"])
    sections.append("")
    sections.append("== Intraday HR Today ==")
    sections.append(_read_intraday_hr_summary())
    sections.append("")
    sections.append("== Recent Coach Notes ==")
    mem = _memory_context("sleep")
    sections.extend(mem if mem else ["No prior summaries found."])
    return "\n".join(sections)


# -----------------------------
# Ollama / HF text generation
# -----------------------------
def _reply_with_ollama(user_input: str) -> str | None:
    # Only attempt if the configured model is actually available locally.
    if not _ollama_model_available():
        return None
    try:
        system_prompt = (
            "You are a friendly, evidence-informed sleep & wellness coach. "
            "Use ONLY the provided context to answer. If not in context, say you don't have that data."
        )
        payload = {
            "model": OLLAMA_MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"CONTEXT:\n{_context_pack()}\n\nQUESTION: {user_input}",
                },
            ],
            "options": {"temperature": 0.4},
        }
        resp = requests.post(f"{OLLAMA_BASE}/api/chat", json=payload, timeout=25)  # keep fast
        resp.raise_for_status()
        msg = resp.json().get("message", {}).get("content")
        if msg:
            return msg.strip()

        gen = requests.post(
            f"{OLLAMA_BASE}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": f"{system_prompt}\n\n{_context_pack()}\n\nUser: {user_input}\nCoach:",
                "stream": False,
            },
            timeout=25,
        )
        gen.raise_for_status()
        j = gen.json()
        return (j.get("response") or "").strip()
    except Exception as e:
        print(f"[coach] Ollama call failed: {e}")
        return None


def _load_hf_pipeline():
    global _hf_pipe
    if _hf_pipe is not None:
        return _hf_pipe
    # Avoid heavy downloads/initialization unless explicitly enabled via ENABLE_HF=1
    if not ENABLE_HF:
        _hf_pipe = None
        return None
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

        tn = AutoTokenizer.from_pretrained(DEFAULT_MODEL)
        md = AutoModelForCausalLM.from_pretrained(
            DEFAULT_MODEL, device_map="auto", torch_dtype="auto"
        )
        _hf_pipe = pipeline(
            "text-generation",
            model=md,
            tokenizer=tn,
            max_new_tokens=256,
            pad_token_id=tn.eos_token_id,
            do_sample=True,
            temperature=0.7,
        )
        return _hf_pipe
    except Exception:
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

            tn = AutoTokenizer.from_pretrained(FALLBACK_MODEL)
            md = AutoModelForCausalLM.from_pretrained(
                FALLBACK_MODEL, device_map="auto", torch_dtype="auto"
            )
            _hf_pipe = pipeline(
                "text-generation",
                model=md,
                tokenizer=tn,
                max_new_tokens=256,
                pad_token_id=tn.eos_token_id,
                do_sample=True,
                temperature=0.7,
            )
            return _hf_pipe
        except Exception:
            _hf_pipe = None
            return None


def _reply_with_hf(user_input: str) -> str:
    pipe = _load_hf_pipeline()
    if pipe is None:
        # If no local HF model is enabled/available, try a data-driven summary
        # for sleep-related prompts using your existing metrics.
        pl = (user_input or "").lower()
        if any(k in pl for k in ["sleep", "rest", "bed", "wake", "habit"]):
            try:
                today, msgs = generate_coach_messages()
                if msgs:
                    add_summaries_to_memory(today, msgs)
                    save_messages(today, msgs)
                    return _format_summary(today, msgs)
            except Exception:
                pass
        # Fallback quick tips if we cannot compute a summary.
        return (
            "I'm your health coach. I couldn't load a local language model right now. "
            "Quick tips: consistent bed/wake times, reduce screens 1h before bed, hydrate earlier, avoid caffeine after noon."
        )
    seed = (
        "You are a friendly, evidence-informed sleep & wellness coach. Answer concisely with practical steps.\n\n"
        f"Context:\n{_context_pack()}\n\nUser: {user_input}\nCoach:"
    )
    out = pipe(seed)[0]["generated_text"]
    return out.split("Coach:", 1)[-1].strip()


# -----------------------------
# Data-driven compare text
# -----------------------------
def _lastnight_numbers():
    segs = load_segments()
    if segs.empty:
        return None, {}, 0.0
    daily = compute_daily_metrics(segs)
    if daily.empty:
        return None, {}, 0.0
    row = daily.sort_values("date").iloc[-1]
    date = pd.to_datetime(row["date"]).date()
    stages, total = {}, 0.0
    for k in ["REM sleep", "Deep sleep", "Light sleep", "Awake (during sleep)"]:
        v = float(row.get(k, 0.0) or 0.0)
        stages[k] = v
        if k != "Awake (during sleep)":
            total += v
    return date, stages, total


def _classify(value: float, lo: float, hi: float) -> str:
    if value < lo:
        return "below"
    if value > hi:
        return "above"
    return "within"


def _data_driven_compare(age: int = 20, sex: str = "male") -> str:
    date, stages_min, total_min = _lastnight_numbers()
    if total_min <= 0 or not stages_min:
        return "I don't have enough last-night sleep data to compare. Try syncing Google Fit and asking again."
    total_h = total_min / 60.0
    need_lo, need_hi = SLEEP_NEED_HOURS
    sleep_flag = _classify(total_h, need_lo, need_hi)
    lines = [
        f"📅 Night of {date}: total sleep {total_h:.1f} h ({sleep_flag} the {need_lo:.0f}–{need_hi:.0f} h guide)."
    ]
    for stage, (lo, hi) in STAGE_PCT_RANGES.items():
        mins = stages_min.get(stage, 0.0)
        pct = (mins / total_min * 100.0) if total_min > 0 else 0.0
        flag = _classify(pct, lo, hi)
        lines.append(
            f"• {stage}: {mins:.0f} min ({pct:.1f}%) — {flag} typical {lo:.0f}–{hi:.0f}%"
        )
    hr_vals = _read_hr_last7_list()
    nums = []
    for s in hr_vals:
        try:
            nums.append(float(s.split(":")[1].split("bpm")[0].strip()))
        except Exception:
            pass
    if nums:
        hr_avg = sum(nums) / len(nums)
        lo, hi = RESTING_HR_ADULT_RANGE
        flag = _classify(hr_avg, lo, hi)
        lines.append(
            f"🫀 7-day avg resting HR: {hr_avg:.0f} bpm — {flag} general adult guide {lo:.0f}–{hi:.0f} bpm "
            f"(athletes {ATHLETE_HR_RANGE[0]:.0f}–{ATHLETE_HR_RANGE[1]:.0f})."
        )
    else:
        lines.append("🫀 No 7-day resting HR average available yet.")
    lines.append(
        "Note: These are general guides for adults, not a diagnosis. Trends over weeks matter more than one night."
    )
    return "\n".join(lines)


def _format_summary(today: str, messages: List[str]) -> str:
    bullets = "\n".join(f"• {m}" for m in messages)
    return f"🛌 Sleep Summary for {today}:\n{bullets}"


# -----------------------------
# Series builders for AI charting
# -----------------------------
def _series_steps_7d() -> Tuple[List[str], List[int]]:
    p = DATA_DIR / "steps_daily.csv"
    if not p.exists():
        return [], []
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    labels = [d.date().isoformat() for d in df["date"]]
    vals = [int(x) if pd.notna(x) else 0 for x in df["steps"]]
    return labels, vals


def _series_calories_7d() -> Tuple[List[str], List[float]]:
    p = DATA_DIR / "calories_daily.csv"
    if not p.exists():
        return [], []
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    labels = [d.date().isoformat() for d in df["date"]]
    vals = [float(x) if pd.notna(x) else 0.0 for x in df["kcal"]]
    return labels, vals


def _series_hr_7d() -> Tuple[List[str], List[float | None], List[float | None], List[float | None]]:
    p = DATA_DIR / "hr_daily.csv"
    if not p.exists():
        return [], [], [], []
    df = pd.read_csv(p, parse_dates=["date"]).sort_values("date").tail(7)
    labels = [d.date().isoformat() for d in df["date"]]
    avg = [float(x) if pd.notna(x) else None for x in df.get("avg_bpm", [])]
    mn = [float(x) if pd.notna(x) else None for x in df.get("min_bpm", [])]
    mx = [float(x) if pd.notna(x) else None for x in df.get("max_bpm", [])]
    return labels, avg, mn, mx


def _series_hr_intraday() -> Tuple[List[str], List[float | None]]:
    p = DATA_DIR / "hr_intraday.csv"
    if not p.exists():
        return [], []
    df = pd.read_csv(p)
    if df.empty or "ts" not in df.columns:
        return [], []
    times = [pd.to_datetime(t).strftime("%H:%M") for t in df["ts"]]
    vals = [float(x) if pd.notna(x) else None for x in df["avg_bpm"]]
    return times, vals


def _series_sleep_stages_7d() -> Tuple[List[str], Dict[str, List[float]]]:
    segs = load_segments()
    if segs.empty:
        return [], {"Light": [], "Deep": [], "REM": []}
    daily = compute_daily_metrics(segs).sort_values("date").tail(7)
    if daily.empty:
        return [], {"Light": [], "Deep": [], "REM": []}
    labels = [pd.to_datetime(d).date().isoformat() for d in daily["date"]]

    def col(name: str) -> List[float]:
        s = daily.get(name)
        return [float(x) if pd.notna(x) else 0.0 for x in (s if s is not None else [0.0] * len(labels))]

    return labels, {"Light": col("Light sleep"), "Deep": col("Deep sleep"), "REM": col("REM sleep")}


def _series_sleep_total_7d() -> Tuple[List[str], List[float]]:
    segs = load_segments()
    if segs.empty:
        return [], []
    daily = compute_daily_metrics(segs).sort_values("date").tail(7)
    if daily.empty:
        return [], []
    labels = [pd.to_datetime(d).date().isoformat() for d in daily["date"]]
    totals = [float(x) if pd.notna(x) else 0.0 for x in daily.get("Sleep", [])]
    return labels, totals


def _series_sleep_window_7d() -> Tuple[List[str], List[float], List[float]]:
    """Return (labels, start_hour_local, end_hour_local) for last 7 nights.
    Hours are in 24h, fractional (e.g., 22.5 = 22:30)."""
    segs = load_segments()
    if segs.empty:
        return [], [], []
    # Consider the restful window (exclude awake-during-sleep periods)
    rest = segs[segs["stage"] != "Awake (during sleep)"]
    if rest.empty:
        return [], [], []
    grp = rest.groupby("night")
    first_start = grp["start"].min()
    last_end = grp["end"].max()
    # Sort by night and keep last 7
    nights = sorted(list(set(rest["night"])))
    nights = nights[-7:]
    # Convert to local tz for hour-of-day visualization
    try:
        local_tz = datetime.now().astimezone().tzinfo
        s_local = first_start.dt.tz_convert(local_tz)
        e_local = last_end.dt.tz_convert(local_tz)
    except Exception:
        s_local = first_start
        e_local = last_end
    labels: List[str] = []
    starts: List[float] = []
    ends: List[float] = []
    for n in nights:
        s = s_local.get(n)
        e = e_local.get(n)
        if pd.isna(s) or pd.isna(e):
            continue
        labels.append(pd.to_datetime(n).isoformat())
        starts.append(float(s.hour) + float(s.minute) / 60.0)
        ends.append(float(e.hour) + float(e.minute) / 60.0)
    return labels, starts, ends


# -----------------------------
# Deterministic (server-side) chart specs for common asks
# -----------------------------
def _align_two_series(labels_a: List[str], vals_a: List[float], labels_b: List[str], vals_b: List[float]):
    common = [d for d in labels_a if d in set(labels_b)]
    if not common:
        return [], [], []
    common = common[-7:]  # keep last 7 overlapping dates
    a_map = dict(zip(labels_a, vals_a))
    b_map = dict(zip(labels_b, vals_b))
    return common, [a_map.get(d) for d in common], [b_map.get(d) for d in common]


def _build_compare_steps_calories_spec() -> Dict[str, Any] | None:
    s_labels, s_vals = _series_steps_7d()
    c_labels, c_vals = _series_calories_7d()
    if not s_labels or not c_labels:
        return None
    if s_labels == c_labels:
        labels, a, b = s_labels, s_vals, c_vals
    else:
        labels, a, b = _align_two_series(s_labels, s_vals, c_labels, c_vals)
    if not labels:
        return None
    return {
        "title": "Steps vs Calories (last 7 days)",
        "type": "line",
        "labels": labels,
        "datasets": [
            {"label": "Steps", "data": a},
            {"label": "Calories", "data": b},
        ],
        "yTitle": "steps / kcal",
        "stacked": False,
    }


def _build_intraday_hr_spec() -> Dict[str, Any] | None:
    labels, vals = _series_hr_intraday()
    if not labels:
        return None
    return {
        "title": "Intraday HR (Today)",
        "type": "line",
        "labels": labels,
        "datasets": [{"label": "Avg BPM", "data": vals}],
        "yTitle": "bpm",
        "stacked": False,
    }


def _build_sleep_stages_7d_spec() -> Dict[str, Any] | None:
    labels, st = _series_sleep_stages_7d()
    if not labels:
        return None
    return {
        "title": "Sleep Stages (last 7 days)",
        "type": "stackedBar",
        "labels": labels,
        "datasets": [
            {"label": "Light sleep", "data": st["Light"]},
            {"label": "Deep sleep", "data": st["Deep"]},
            {"label": "REM sleep", "data": st["REM"]},
        ],
        "yTitle": "minutes",
        "stacked": True,
    }


def _build_sleep_window_7d_spec() -> Dict[str, Any] | None:
    labels, start_h, end_h = _series_sleep_window_7d()
    if not labels:
        return None
    return {
        "title": "Sleep Start vs End (last 7 nights)",
        "type": "line",
        "labels": labels,
        "datasets": [
            {"label": "Sleep start (hour)", "data": start_h},
            {"label": "Wake time (hour)", "data": end_h},
        ],
        "yTitle": "hour of day",
        "stacked": False,
    }


def _build_calories_next3_spec() -> Dict[str, Any] | None:
    labels, vals = _series_calories_7d()
    if not labels:
        return None
    # naive projection using last 3-day mean and recent slope
    n = len(vals)
    last3 = vals[-3:] if n >= 3 else vals
    base = sum(last3) / max(1, len(last3))
    slope = 0.0
    if n >= 2:
        slope = vals[-1] - vals[-2]
    pred1 = max(0.0, base + 0.5 * slope)
    pred2 = max(0.0, base + 1.0 * slope)
    pred3 = max(0.0, base + 1.5 * slope)
    proj_labels = labels + ["D+1", "D+2", "D+3"]
    proj_values = vals + [pred1, pred2, pred3]
    return {
        "title": "Calories (last 7 + next 3 days — naive projection)",
        "type": "line",
        "labels": proj_labels,
        "datasets": [{"label": "Calories", "data": proj_values}],
        "yTitle": "kcal",
        "stacked": False,
    }


def _direct_viz_spec(user_input: str) -> Dict[str, Any] | None:
    q = (user_input or "").lower()
    if "compare" in q and "step" in q and "calor" in q:
        return _build_compare_steps_calories_spec()
    if "intraday" in q and "hr" in q:
        return _build_intraday_hr_spec()
    if "sleep" in q and ("stage" in q or "last 7" in q or "week" in q):
        return _build_sleep_stages_7d_spec()
    if ("sleep start" in q and ("end" in q or "wake" in q)) or ("bedtime" in q and ("waketime" in q or "wake time" in q)):
        return _build_sleep_window_7d_spec()
    if "calor" in q and ("next 3" in q or "next three" in q or "projection" in q or "forecast" in q):
        return _build_calories_next3_spec()
    return None


# -----------------------------
# LLM chart planner (fallback)
# -----------------------------
def _viz_context_json() -> str:
    s_labels, s_vals = _series_steps_7d()
    c_labels, c_vals = _series_calories_7d()
    h_labels, h_avg, h_min, h_max = _series_hr_7d()
    hd_labels, hd_vals = _series_hr_intraday()
    sl_labels, sl = _series_sleep_stages_7d()
    st_labels, st_vals = _series_sleep_total_7d()
    sw_labels, sw_start, sw_end = _series_sleep_window_7d()
    ctx = {
        "steps7": {"labels": s_labels, "data": s_vals},
        "calories7": {"labels": c_labels, "data": c_vals},
        "hr7": {"labels": h_labels, "avg": h_avg, "min": h_min, "max": h_max},
        "hr_intraday": {"labels": hd_labels, "avg": hd_vals},
        "sleep7": {"labels": sl_labels, "light": sl["Light"], "deep": sl["Deep"], "rem": sl["REM"]},
        "sleep_total7": {"labels": st_labels, "minutes": st_vals},
        "sleep_window7": {"labels": sw_labels, "start_hour": sw_start, "end_hour": sw_end},
        "now": datetime.now(timezone.utc).isoformat(),
    }
    return json.dumps(ctx, ensure_ascii=False)


def _try_parse_json_block(text: str) -> Dict[str, Any] | None:
    try:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        return json.loads(text[start : end + 1])
    except Exception:
        return None


def _reply_with_ollama_viz(user_input: str) -> Dict[str, Any] | None:
    if not _ollama_model_available():
        return None
    try:
        system = (
            "You are a Chart Planner. Use ONLY the provided context arrays to build one chart.\n"
            "Return STRICT JSON with keys: title, type, labels, datasets, yTitle, stacked (optional boolean).\n"
            "Supported types: 'line', 'bar', 'stackedBar'.\n"
            "Rules:\n"
            "- Use labels exactly from the context for the series you plot.\n"
            "- datasets is a list of {label, data} aligned to labels.\n"
            "- Do not invent or smooth values; pick from hr7/steps7/calories7/hr_intraday/sleep7/sleep_total7/sleep_window7.\n"
            "- If user asks for sleep stages, use type='stackedBar' with Light/Deep/REM minutes.\n"
            "- If user asks for intraday HR today, use hr_intraday.avg.\n"
            "- If user asks to compare steps vs calories, include both datasets sharing the same (last 7) labels.\n"
            "- If user asks for sleep start vs end (bedtime vs wake time), use 'sleep_window7' with type='line' and two datasets: start_hour and end_hour.\n"
            "- If unclear, pick the most relevant single series."
        )
        context = _viz_context_json()
        payload = {
            "model": OLLAMA_MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": f"CONTEXT:\n{context}\n\nREQUEST:\n{user_input}\n\nReturn JSON only.",
                },
            ],
            "options": {"temperature": 0.2},
        }
        r = requests.post(f"{OLLAMA_BASE}/api/chat", json=payload, timeout=25)
        r.raise_for_status()
        msg = r.json().get("message", {}).get("content", "")
        spec = _try_parse_json_block(msg)
        if (
            spec
            and all(k in spec for k in ("type", "labels", "datasets"))
            and isinstance(spec["datasets"], list)
        ):
            return spec
    except Exception as e:
        print(f"[viz] ollama viz failed: {e}")
    return None


# -----------------------------
# Public entrypoint
# -----------------------------
def run_chat(user_input: str) -> Tuple[str, Dict[str, Any] | None]:
    """
    Returns (text_reply, viz_spec_or_none).
    viz_spec, when present, follows a minimal Chart.js spec:
      {type, labels, datasets, title?, yTitle?, stacked?}
    """
    prompt = (user_input or "").strip()
    pl = prompt.lower()

    # Fast path for chart-like prompts: avoid making both text and viz LLM calls.
    if any(
        k in pl
        for k in [
            "plot",
            "chart",
            "graph",
            "trend",
            "visual",
            "visualize",
            "vs",
            "compare",
            "show me",
            "forecast",
            "projection",
        ]
    ):
        # Try deterministic spec first (no LLM).
        spec = _direct_viz_spec(prompt)
        if spec:
            return "Here’s the chart you asked for.", spec
        # Try a single Ollama viz call if the model is ready.
        spec = _reply_with_ollama_viz(prompt)
        if spec:
            return "Here’s the chart you asked for.", spec
        # Still nothing: respond quickly with suggestions (no LLM calls).
        return (
            "I couldn’t build that chart yet. Try: ‘plot intraday HR’, ‘compare steps vs calories’, or ‘sleep stages chart last 7 days’.",
            None,
        )

    # If user asked for a chart, try fast deterministic viz FIRST (no LLM).
    charty = any(
        k in pl
        for k in ["plot", "chart", "graph", "trend", "visual", "visualize", "vs", "compare", "show me", "forecast", "projection"]
    )
    if charty:
        spec = _direct_viz_spec(prompt)
        if spec:
            text = "Here’s the chart you asked for."
            return text, spec

    # Primary text reply logic
    compare_triggers = ["compare", "compared", "benchmark", "average", "normal", " vs ", "versus"]
    age_triggers = ["20 yr", "20year", "20-year", "20 year", "twenty"]
    sex_triggers = ["male", "man", "men"]
    if any(t in pl for t in compare_triggers) and (
        any(t in pl for t in age_triggers) or any(t in pl for t in sex_triggers)
    ):
        text = _data_driven_compare(age=20, sex="male")
    elif any(k in pl for k in [
        "summary",
        "report",
        "how did i sleep",
        "how is my sleep",
        "how are my sleep",
        "sleep habits",
        "sleep habit",
        "sleep quality",
    ]):
        today, msgs = generate_coach_messages()
        add_summaries_to_memory(today, msgs)
        save_messages(today, msgs)
        text = _format_summary(today, msgs)
    elif any(k in pl for k in ["reminder", "hydrate", "what did you tell me", "what did coach say", "memory"]):
        res = query_memory(prompt, k=5)
        text = (
            "\n".join(f"💡 {r['message']} (on {r['metadata'].get('date', '?')})" for r in res)
            if res
            else "I couldn’t find anything relevant in your past summaries yet."
        )
    elif any(k in pl for k in ["pie chart", "chart", "graph"]) and "sleep" in pl:
        img_path = plot_weekly_pie()
        text = f"Here’s your weekly sleep stage pie chart: 📊\nImage: /media/{Path(img_path).name}"
    elif any(k in pl for k in ["heart rate", "hr last 7", "hr trend"]):
        text = _read_hr_last7()
    elif any(k in pl for k in ["intraday hr", "hr today", "today hr", "realtime hr"]):
        text = _read_intraday_hr_summary()
    elif any(k in pl for k in ["steps", "walk", "activity"]):
        s = _read_steps_last7_list()
        text = "🚶 Steps (last 7 days):\n" + ("\n".join("• " + x for x in s) if s else "No steps data yet.")
    elif any(k in pl for k in ["calorie", "calories", "kcal"]):
        c = _read_calories_last7_list()
        text = "🔥 Calories (last 7 days):\n" + ("\n".join("• " + x for x in c) if c else "No calories data yet.")
    else:
        text = _reply_with_ollama(prompt) or _reply_with_hf(prompt)

    # End of text-first path. Avoid extra LLM calls here to reduce latency/timeouts.
    return text, None
