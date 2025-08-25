import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const PALETTE = ['#93c5fd','#34d399','#f9a8d4','#fde047','#60a5fa','#f87171'];

export default function StackedBar({ labels = [], datasets = [] }) {
  const ds = datasets.map((d, i) => ({
    ...d,
    data: (d.data || []).map(v => Number(v || 0)),
    backgroundColor: d.backgroundColor || PALETTE[i % PALETTE.length],
    borderColor: d.borderColor || 'transparent',
    borderWidth: 0
  }));

  const data = { labels, datasets: ds };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { stacked: true, grid: { color: 'rgba(255,255,255,.06)' } },
      y: { stacked: true, grid: { color: 'rgba(255,255,255,.06)' } }
    }
  };
  return <div className="chart"><Bar data={data} options={options} /></div>;
}