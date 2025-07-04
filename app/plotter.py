import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def plot_weekly_pie(csv_path='data/sleep_segments.csv', out_path='data/pie_chart.png'):
    df = pd.read_csv(csv_path, parse_dates=['start', 'end'])
    df['duration_min'] = (df['end'] - df['start']).dt.total_seconds() / 60
    df['week'] = df['start'].dt.isocalendar().week
    latest_week = df['week'].max()
    df = df[df['week'] == latest_week]

    total = df.groupby('stage')['duration_min'].sum()
    plt.figure(figsize=(6,6))
    total.plot.pie(autopct='%1.1f%%', startangle=90)
    plt.title(f"Sleep Stage Distribution (Week {latest_week})")
    plt.ylabel("")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    plt.savefig(out_path)
    plt.close()
    return out_path