import os
import pandas as pd
from anomaly_detector import load_segments, compute_daily_metrics, update_baseline, flag_anomalies

# CONFIG: templates for each stage
TEMPLATES = {
    'REM sleep': ("Your REM sleep was only {today:.1f} min vs your 7-day average of {baseline:.1f} min "
                  "—did you remember to hydrate well before bed?"),
    'Deep sleep': ("You got {today:.1f} min of deep sleep vs your average of {baseline:.1f} min "
                   "—consider a wind-down routine with light stretching."),
    'Light sleep': ("Light sleep was {today:.1f} min compared to average {baseline:.1f} min "
                    "—try limiting screen time before sleep."),
    'Awake (during sleep)': ("You were awake {today:.1f} min overnight, up from {baseline:.1f} min average "
                              "—could caffeine be affecting you?"),
}

OUTPUT_FILE = '../data/coach_messages.txt'


def generate_coach_messages():
    # 1. Load data and run anomaly detection
    segs  = load_segments()
    daily = compute_daily_metrics(segs)
    base  = update_baseline(daily)
    today, flags = flag_anomalies(base)

    # 2. Generate messages from flags
    messages = []
    for stage, stats in flags.items():
        template = TEMPLATES.get(stage)
        if template:
            messages.append(template.format(**stats))
        else:
            # generic fallback
            messages.append(
                f"Your {stage} was {stats['today']:.1f} min vs avg {stats['baseline']:.1f} min."
            )

    # 3. If no anomalies, add a positive note
    if not messages:
        messages.append("Great job! No significant sleep anomalies detected last night.")

    return today, messages


def save_messages(today, messages):
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        f.write(f"Coach Summary for {today}\n")
        for msg in messages:
            f.write(f"- {msg}\n")
    print(f"Coach messages saved to {OUTPUT_FILE}")


if __name__ == '__main__':
    day, msgs = generate_coach_messages()
    print(f"📋 Coach Summary for {day}:")
    for m in msgs:
        print(" -", m)
    save_messages(day, msgs)