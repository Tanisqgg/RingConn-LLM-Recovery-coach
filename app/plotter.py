import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def plot_weekly_pie() -> str:
    """
    Build a weekly sleep-stage pie from data/sleep_segments.csv.
    - Stages normalized: REM sleep, Deep sleep, Light sleep, Awake (during sleep), Sleep
    - Uses LOCAL_TZ to compute ISO week; shows the latest week in the file
    - 'Awake (during sleep)' is excluded from the pie but shown as a caption
    Returns: filepath to the saved PNG.
    """
    import os
    import pandas as pd
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from datetime import datetime
    from . import DATA_DIR

    # --- timezone (align to your local day/week) ---
    try:
        from zoneinfo import ZoneInfo  # py3.9+
        LOCAL_TZ = ZoneInfo(os.getenv("APP_TZ", "America/Chicago"))
    except Exception:
        from tzlocal import get_localzone
        LOCAL_TZ = get_localzone()

    path = DATA_DIR / "sleep_segments.csv"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found")

    df = pd.read_csv(path, parse_dates=["start", "end"])
    if df.empty:
        raise ValueError("sleep_segments.csv is empty")

    # --- normalize stage names from CSV ---
    def _norm(stage: str) -> str:
        s = str(stage).strip().lower()
        if "rem" in s:    return "REM sleep"
        if "deep" in s:   return "Deep sleep"
        if "light" in s:  return "Light sleep"
        if "awake" in s:  return "Awake (during sleep)"
        if s == "sleep":  return "Sleep"
        return stage  # fall back to original

    df["stage"] = df["stage"].apply(_norm)

    # Some files may still have generic "Sleep" plus granular stages on the same local day.
    # If granular exists for a local day, drop the generic "Sleep" rows for that day.
    df["local_date"] = df["start"].dt.tz_convert(LOCAL_TZ).dt.date
    granular = {"Light sleep", "Deep sleep", "REM sleep", "Awake (during sleep)"}
    has_granular = df.groupby("local_date")["stage"].transform(lambda s: s.isin(granular).any())
    df = df[~(has_granular & df["stage"].eq("Sleep"))].copy()

    # --- compute minutes and pick latest ISO week in LOCAL_TZ ---
    df["mins"] = (df["end"] - df["start"]).dt.total_seconds() / 60.0
    df["iso_week"] = df["start"].dt.tz_convert(LOCAL_TZ).dt.isocalendar().week.astype(int)
    df["iso_year"] = df["start"].dt.tz_convert(LOCAL_TZ).dt.isocalendar().year.astype(int)

    # pick the latest (year, week) present
    last_year = int(df["iso_year"].max())
    last_week = int(df[df["iso_year"] == last_year]["iso_week"].max())
    wdf = df[(df["iso_year"] == last_year) & (df["iso_week"] == last_week)].copy()

    if wdf.empty:
        raise ValueError("No sleep segments found for the latest week")

    # Sum by stage
    totals = wdf.groupby("stage", as_index=False)["mins"].sum()

    # Ensure all slices exist, even if 0
    for st in ["Light sleep", "Deep sleep", "REM sleep", "Awake (during sleep)"]:
        if st not in set(totals["stage"]):
            totals = pd.concat([totals, pd.DataFrame([{"stage": st, "mins": 0.0}])], ignore_index=True)

    # Separate awake and pie stages
    awake_mins = float(totals.loc[totals["stage"] == "Awake (during sleep)", "mins"].sum())
    pie_df = totals[totals["stage"].isin(["Light sleep", "Deep sleep", "REM sleep"])].copy()

    total_sleep = float(pie_df["mins"].sum())
    if total_sleep <= 0:
        # If we have only Awake or generic Sleep, avoid a misleading 100% slice
        raise ValueError("No granular sleep-stage minutes in the latest week")

    pie_df = pie_df.sort_values("mins", ascending=False).reset_index(drop=True)
    labels = pie_df["stage"].tolist()
    sizes = pie_df["mins"].tolist()
    perc  = (pie_df["mins"] / total_sleep * 100.0).round(1)

    # --- draw chart (avoid overlapping labels) ---
    fig, ax = plt.subplots(figsize=(6.2, 6.2), dpi=150)
    wedges, _ = ax.pie(
        sizes,
        startangle=90,
        counterclock=False,
        # no labels on wedges to prevent collisions; we'll use a legend
        labels=None,
        wedgeprops=dict(width=0.85, edgecolor="white", linewidth=1.0),
    )

    # Legend with minutes + percentages
    legend_labels = [f"{lab}: {mins:.0f} min ({p:.1f}%)" for lab, mins, p in zip(labels, sizes, perc)]
    ax.legend(
        wedges,
        legend_labels,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.06),
        frameon=False,
        ncol=1,
        fontsize=10,
    )

    # Title + center text
    ax.set_title(f"Sleep Stage Distribution (Week {last_week})", pad=14)
    ax.text(0, 0, f"{int(round(total_sleep))} min", ha="center", va="center", fontsize=12)

    # Caption line for Awake
    fig.text(
        0.5, 0.05,
        f"Awake: {awake_mins:.0f} min (not counted in pie)",
        ha="center", fontsize=10,
    )

    fig.tight_layout()
    out = DATA_DIR / "sleep_week_pie.png"
    fig.savefig(out, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return str(out)