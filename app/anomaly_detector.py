import os
import pandas as pd
from datetime import datetime, timedelta

# CONFIG
SEGMENTS_CSV = 'data/sleep_segments.csv'
BASELINE_CSV = 'data/metrics_baseline.csv'
ANOMALY_THRESH = 1.5  # flag if today < baseline - thresh*std
MIN_HISTORY_DAYS = 3  # minimum days of history to compute baseline


def load_segments():
    # expects: start,end,stage columns
    df = pd.read_csv(SEGMENTS_CSV, parse_dates=['start', 'end'])
    df['date'] = pd.to_datetime(df['start'].dt.date)
    return df


def compute_daily_metrics(df):
    # compute duration (mins) per stage per day
    df['duration_min'] = (df['end'] - df['start']).dt.total_seconds() / 60
    daily = (
        df
        .groupby(['date', 'stage'])
        .duration_min.sum()
        .unstack(fill_value=0)
        .reset_index()
    )
    return daily


def update_baseline(daily):
    # Ensure baseline and daily use datetime types for 'date'
    daily['date'] = pd.to_datetime(daily['date'])

    # load existing baseline or init empty
    if os.path.exists(BASELINE_CSV):
        base = pd.read_csv(BASELINE_CSV, parse_dates=['date'])
    else:
        base = pd.DataFrame()

    # append new, drop duplicates, sort by datetime
    base = pd.concat([base, daily], ignore_index=True)
    base = base.drop_duplicates(['date']).sort_values('date')
    base.to_csv(BASELINE_CSV, index=False)
    return base


def flag_anomalies(base):
    # Get today's date (max date in baseline)
    today = base['date'].max()
    # Historical data excludes today
    hist = base[base['date'] < today].set_index('date')
    today_vals = base[base['date'] == today].set_index('date')

    flags = {}
    # If not enough history, skip anomalies
    if len(hist) < MIN_HISTORY_DAYS:
        return today.date(), flags

    # Check each sleep stage metric
    for col in ['REM sleep', 'Deep sleep', 'Light sleep', 'Awake (during sleep)']:
        if col not in hist.columns:
            continue
        series = hist[col].dropna()
        if len(series) < MIN_HISTORY_DAYS:
            continue
        # rolling baseline
        rolling_mean = series.rolling(7, min_periods=MIN_HISTORY_DAYS).mean()
        rolling_std = series.rolling(7, min_periods=MIN_HISTORY_DAYS).std()
        mu = rolling_mean.iloc[-1]
        sigma = rolling_std.iloc[-1]
        if pd.isna(mu) or pd.isna(sigma):
            continue

        today_v = today_vals[col].iat[0]
        if today_v < mu - ANOMALY_THRESH * sigma:
            flags[col] = {
                'today': today_v,
                'baseline': mu,
                'std': sigma
            }
    return today.date(), flags


def main():
    # Load and aggregate segments
    segs = load_segments()
    daily = compute_daily_metrics(segs)

    # Update baseline store
    base = update_baseline(daily)

    # Detect anomalies
    today, flags = flag_anomalies(base)

    # Output results
    if flags:
        print(f"⚠️ Anomalies detected for {today}:")
        for stage, stats in flags.items():
            print(
                f" • {stage}: {stats['today']:.1f} min vs avg {stats['baseline']:.1f} ± {stats['std']:.1f}"
            )
    else:
        print(f"✅ No anomalies for {today}.")


if __name__ == '__main__':
    main()
