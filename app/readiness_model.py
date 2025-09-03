# readiness_model.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import math
import numpy as np

try:
    # Ridge is tiny & fast; fallback to pure-numpy baseline if not installed
    from sklearn.linear_model import Ridge
    HAVE_SKLEARN = True
except Exception:
    HAVE_SKLEARN = False

@dataclass
class DailyRow:
    # one row per calendar day (local)
    date: str            # "YYYY-MM-DD"
    readiness: Optional[float]  # 0..100 (target); may be None for today
    rhr: Optional[float]        # resting HR (bpm)
    hrv: Optional[float]        # rMSSD or similar (ms)
    sleep_total_min: Optional[float]
    sleep_deep_min: Optional[float]
    sleep_rem_min: Optional[float]
    activity_min: Optional[float]  # “moderate+vigorous” minutes
    steps: Optional[int]
    temp_dev_c: Optional[float]    # skin/body temp deviation vs baseline, if available

def _safe(x, default=0.0):
    return float(x) if (x is not None and not (isinstance(x, float) and math.isnan(x))) else default

def _rolling(arr: List[float], k: int) -> float:
    xs = [a for a in arr[-k:] if a is not None and not math.isnan(a)]
    return float(np.mean(xs)) if xs else np.nan

def _ema(arr: List[float], alpha: float=0.3) -> float:
    out = None
    for v in arr:
        if v is None or math.isnan(v): 
            continue
        out = v if out is None else (alpha*v + (1-alpha)*out)
    return float(out) if out is not None else np.nan

def build_feature_vector(history: List[DailyRow]) -> Tuple[np.ndarray, List[str]]:
    """
    Expects history sorted by date ascending.
    Uses Y-1 day and trailing stats to predict Y (today).
    """
    if not history:
        return np.zeros((1, 1)), ["bias"]

    # yesterday is last complete day
    y = history[-1]

    # trailing sequences (exclude y if it’s None? We use best effort.)
    rhr_hist   = [r.rhr for r in history]
    hrv_hist   = [r.hrv for r in history]
    st_hist    = [r.sleep_total_min for r in history]
    sdeep_hist = [r.sleep_deep_min for r in history]
    srem_hist  = [r.sleep_rem_min for r in history]
    act_hist   = [r.activity_min for r in history]
    steps_hist = [float(r.steps) if r.steps is not None else None for r in history]
    temp_hist  = [r.temp_dev_c for r in history]

    feats = []
    names = []

    def add(name, val):
        names.append(name)
        feats.append(0.0 if (val is None or (isinstance(val, float) and math.isnan(val))) else float(val))

    # — Yesterday (raw) —
    add("y_rhr", _safe(y.rhr, np.nan))
    add("y_hrv", _safe(y.hrv, np.nan))
    add("y_sleep_total", _safe(y.sleep_total_min, np.nan))
    add("y_sleep_deep", _safe(y.sleep_deep_min, np.nan))
    add("y_sleep_rem", _safe(y.sleep_rem_min, np.nan))
    add("y_activity_min", _safe(y.activity_min, np.nan))
    add("y_steps", _safe(y.steps, np.nan))
    add("y_temp_dev_c", _safe(y.temp_dev_c, np.nan))

    # — Ratios / composition —
    if y.sleep_total_min and y.sleep_total_min > 0:
        add("y_deep_ratio", _safe(y.sleep_deep_min, 0)/y.sleep_total_min)
        add("y_rem_ratio",  _safe(y.sleep_rem_min, 0)/y.sleep_total_min)
    else:
        add("y_deep_ratio", np.nan)
        add("y_rem_ratio",  np.nan)

    # — Short rolling (last 7d) —
    for k in (3, 7):
        add(f"rhr_mean_{k}", _rolling(rhr_hist, k))
        add(f"hrv_mean_{k}", _rolling(hrv_hist, k))
        add(f"sleep_total_mean_{k}", _rolling(st_hist, k))
        add(f"deep_mean_{k}", _rolling(sdeep_hist, k))
        add(f"rem_mean_{k}", _rolling(srem_hist, k))
        add(f"act_min_mean_{k}", _rolling(act_hist, k))
        add(f"steps_mean_{k}", _rolling(steps_hist, k))
        add(f"temp_dev_mean_{k}", _rolling(temp_hist, k))

    # — Momentum (EMA) —
    add("rhr_ema", _ema(rhr_hist))
    add("hrv_ema", _ema(hrv_hist))
    add("sleep_total_ema", _ema(st_hist))
    add("deep_ema", _ema(sdeep_hist))
    add("rem_ema", _ema(srem_hist))
    add("act_ema", _ema(act_hist))
    add("steps_ema", _ema(steps_hist))
    add("temp_dev_ema", _ema(temp_hist))

    # bias
    add("bias", 1.0)

    X = np.array(feats, dtype=float)[None, :]
    # Replace any lingering NaNs with column means (or 0)
    col_means = np.nanmean(np.where(np.isnan(X), np.nan, X), axis=0)
    col_means = np.where(np.isnan(col_means), 0.0, col_means)
    X = np.where(np.isnan(X), col_means, X)
    return X, names

def train_model(history: List[DailyRow], window: int = 90):
    """
    Train on last `window` days where readiness is known, predicting readiness[t] from features of day t-1 and trailing stats up to t-1.
    """
    if len(history) < 10:
        return None  # not enough to train a reliable regressor

    # Build supervised dataset
    Xs, ys = [], []
    for t in range(1, len(history)):
        if history[t].readiness is None:
            continue
        # use all rows up to t-1 to compute features, target is readiness[t]
        X, _ = build_feature_vector(history[:t])
        Xs.append(X[0])
        ys.append(float(history[t].readiness))

    if len(ys) < 8:
        return None

    Xmat = np.vstack(Xs)[-window:] if len(Xs) > window else np.vstack(Xs)
    yvec = np.array(ys, dtype=float)[-window:]

    if HAVE_SKLEARN:
        model = Ridge(alpha=1.0, fit_intercept=False)  # bias already in features
        model.fit(Xmat, yvec)
        return ("ridge", model)
    else:
        # Minimal fallback: a weighted rule-based blend (no external deps)
        return ("baseline", None)

def predict_today(history: List[DailyRow]) -> Dict:
    """
    Returns {'predicted': float, 'confidence': float, 'features_used': [names]}
    """
    if not history:
        return {"predicted": 50.0, "confidence": 0.2, "features_used": []}

    X, names = build_feature_vector(history)
    model = train_model(history)

    # If we have a trained Ridge, use it
    if model and model[0] == "ridge":
        _, ridge = model
        pred = float(np.clip(ridge.predict(X)[0], 0.0, 100.0))
        # crude confidence: based on data quantity
        n = min(len(history), 90)
        conf = 0.4 + 0.6 * (n / 90.0)
        return {"predicted": pred, "confidence": float(conf), "features_used": names}

    # Fallback heuristic:
    y = history[-1]
    # Start from 70 and adjust
    pred = 70.0
    # More sleep & more HRV → higher, high RHR & high temp → lower
    pred += ( _safe(y.hrv) - 40.0 ) * 0.15
    pred += ( _safe(y.sleep_total_min) - 420.0 ) * 0.03  # 7h baseline
    pred += ( _safe(y.sleep_deep_min) - 60.0 ) * 0.05
    pred += ( _safe(y.sleep_rem_min)  - 90.0 ) * 0.03
    pred += ( _safe(y.activity_min) - 30.0 ) * 0.02     # prior-day strain balance
    pred -= ( _safe(y.rhr) - 60.0 ) * 0.20
    pred -= ( _safe(y.temp_dev_c) ) * 4.0

    pred = float(np.clip(pred, 0.0, 100.0))
    conf = 0.3 + 0.02 * min(len(history), 35)
    return {"predicted": pred, "confidence": float(min(conf, 0.8)), "features_used": names}