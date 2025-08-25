import React from 'react';

export default function KPIs({ sleepMin='--', hr='--', steps='--', kcal='--' }){
  return (
    <div className="kpis">
      <div className="kpi"><small>Sleep (last night)</small><strong>{sleepMin}</strong></div>
      <div className="kpi"><small>HR (yesterday avg)</small><strong>{hr}</strong></div>
      <div className="kpi"><small>Steps (yesterday)</small><strong>{steps}</strong></div>
      <div className="kpi"><small>Calories (yesterday)</small><strong>{kcal}</strong></div>
    </div>
  );
}
