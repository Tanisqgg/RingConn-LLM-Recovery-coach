import React from 'react';
import TrendLine from './TrendLine.jsx';
import StackedBar from './StackedBar.jsx';

export default function AIChart({ spec }) {
  if (!spec) return <div className="tiny muted">Ask the coach for a chart: “plot intraday HR”, “compare steps vs calories”…</div>;
  const type = spec.type === 'stackedBar' ? 'bar' : spec.type;
  if (type === 'bar' && spec.stacked) {
    return (
      <>
        <StackedBar labels={spec.labels} datasets={spec.datasets} />
        {spec.title ? <div className="tiny muted" style={{marginTop:8}}>{spec.title}</div> : null}
      </>
    );
  }
  return (
    <>
      <TrendLine labels={spec.labels} datasets={spec.datasets} />
      {spec.title ? <div className="tiny muted" style={{marginTop:8}}>{spec.title}</div> : null}
    </>
  );
}
