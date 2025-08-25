import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

export default function ReadinessGauge({ score = 0 }) {
  const val = Math.max(0, Math.min(100, Math.round(score)));
  const zone = val >= 80 ? 'ok' : val >= 60 ? 'warn' : 'bad';
  const colors = zone === 'ok' ? ['#22c55e','#1f2937'] : zone === 'warn' ? ['#f59e0b','#1f2937'] : ['#ef4444','#1f2937'];
  const data = { labels: ['Readiness',''], datasets: [{ data: [val, 100-val], backgroundColor: colors, borderWidth: 0, cutout: '75%' }] };
  const options = { plugins: { legend: { display: false }, tooltip: { enabled: false } }, maintainAspectRatio: false };
  return (
    <div className="gauge">
      <Doughnut data={data} options={options} />
      <div className="center">
        <div className={`big ${zone}`}>{val}</div>
        <div className="label">{zone === 'ok' ? 'Primed' : zone === 'warn' ? 'Moderate' : 'Recover'}</div>
      </div>
    </div>
  );
}