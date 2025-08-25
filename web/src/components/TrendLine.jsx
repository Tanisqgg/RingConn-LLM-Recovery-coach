import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip
} from 'chart.js';
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

// simple dark-friendly palette
const PALETTE = ['#59ffa2','#60a5fa','#f472b6','#facc15','#34d399','#f87171','#a78bfa'];

export default function TrendLine({ labels = [], datasets = [], stacked = false }) {
  // ensure visible colors + numeric coercion
  const ds = datasets.map((d, i) => ({
    ...d,
    data: (d.data || []).map(v => (v == null || v === '' ? null : Number(v))),
    borderColor: d.borderColor || PALETTE[i % PALETTE.length],
    backgroundColor: d.backgroundColor || PALETTE[i % PALETTE.length],
    pointBackgroundColor: d.pointBackgroundColor || PALETTE[i % PALETTE.length],
    spanGaps: true,
    fill: false,
    borderWidth: 2
  }));

  const data = { labels, datasets: ds };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    elements: { point: { radius: 2 } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.06)' } },
      y: { stacked: !!stacked, grid: { color: 'rgba(255,255,255,.06)' } }
    }
  };
  return <div className="chart"><Line data={data} options={options} /></div>;
}