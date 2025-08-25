import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getModel, getHRLast7, getHRIntraday, getStepsLast7, getCaloriesLast7, getSleepDebug,
  postChat, postSync
} from './api.js';
import ReadinessGauge from './components/ReadinessGauge.jsx';
import TrendLine from './components/TrendLine.jsx';
import StackedBar from './components/StackedBar.jsx';
import AIChart from './components/AIChart.jsx';

export default function App(){
  const [model, setModel] = useState({reachable:false, configured:false, model:''});
  const [sleepRows, setSleepRows] = useState([]);
  const [hr7, setHr7] = useState([]);
  const [hrIntra, setHrIntra] = useState([]);
  const [steps7, setSteps7] = useState([]);
  const [cal7, setCal7] = useState([]);
  const [aiSpec, setAiSpec] = useState(null);
  const [chatLog, setChatLog] = useState("Ask for visuals like: “plot intraday HR”, “compare steps vs calories”, “sleep stages chart last 7 days”.");
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  // load model & data
  useEffect(() => {
    (async () => {
      try { const j = await getModel(); setModel(j.ollama || {}); } catch {}
      try { const j = await getSleepDebug(); setSleepRows(j.data || []); } catch {}
      try { const j = await getHRLast7(); setHr7(j.data || []); } catch {}
      try { const j = await getHRIntraday(); setHrIntra(j.samples || []); } catch {}
      try { const j = await getStepsLast7(); setSteps7(j.data || []); } catch {}
      try { const j = await getCaloriesLast7(); setCal7(j.data || []); } catch {}
    })();
  }, []);

  // Build Sleep stacked datasets (last 7 days)
  const sleepDates = useMemo(() => {
    const uniq = [...new Set(sleepRows.map(r => r.date))].sort();
    return uniq.slice(-7);
  }, [sleepRows]);

  const sleepByDate = useMemo(() => {
    const map = {};
    sleepRows.forEach(r => {
      map[r.date] = map[r.date] || {};
      map[r.date][r.stage] = (map[r.date][r.stage] || 0) + (r.mins || 0);
    });
    return map;
  }, [sleepRows]);

  const sleepDatasets = useMemo(() => ([
    { label: 'Light sleep', data: sleepDates.map(d => (sleepByDate[d]?.['Light sleep']||0)), borderWidth:0, type:'bar' },
    { label: 'Deep sleep',  data: sleepDates.map(d => (sleepByDate[d]?.['Deep sleep']||0)),  borderWidth:0, type:'bar' },
    { label: 'REM sleep',   data: sleepDates.map(d => (sleepByDate[d]?.['REM sleep']||0)),   borderWidth:0, type:'bar' }
  ]), [sleepDates, sleepByDate]);

  // KPIs + readiness
  const kpiSleepMin = useMemo(() => {
    const last = sleepDates[sleepDates.length-1];
    if (!last) return '--';
    const total = ['Light sleep','Deep sleep','REM sleep'].reduce((a,s)=> a + (sleepByDate[last]?.[s]||0), 0);
    return Math.round(total) + ' min';
  }, [sleepDates, sleepByDate]);

  const kpiHr = useMemo(() => {
    if (!hr7.length) return '--';
    const last = hr7[hr7.length-1];
    return (last.avg_bpm != null ? Math.round(last.avg_bpm) + ' bpm' : '--');
  }, [hr7]);

  const kpiSteps = useMemo(() => {
    if (!steps7.length) return '--';
    const last = steps7[steps7.length-1];
    return (last.steps || 0).toLocaleString();
  }, [steps7]);

  const kpiCal = useMemo(() => {
    if (!cal7.length) return '--';
    const last = cal7[cal7.length-1];
    return Math.round(last.kcal || 0) + ' kcal';
  }, [cal7]);

  const readiness = useMemo(() => {
    const goal = 8*60;
    const last = sleepDates[sleepDates.length-1];
    const sleepMin = last ? ['Light sleep','Deep sleep','REM sleep'].reduce((a,s)=> a + (sleepByDate[last]?.[s]||0),0) : 0;
    const sleepScore = Math.max(0, Math.min(1, (goal ? sleepMin/goal : 0.5)));
    const hrAvg = hr7.map(r => r.avg_bpm).filter(v => v != null);
    const weeklyAvg = hrAvg.length ? hrAvg.reduce((a,b)=>a+b,0)/hrAvg.length : 0;
    const yesterday = hrAvg.length ? (hr7[hr7.length-1].avg_bpm ?? weeklyAvg) : weeklyAvg;
    const hrScore = Math.max(0, Math.min(1, 1 - ((yesterday - weeklyAvg)/20)));
    const stepsVals = steps7.map(r => r.steps || 0);
    const sAvg = stepsVals.length ? (stepsVals.reduce((a,b)=>a+b,0) / stepsVals.length) : 0;
    const rel = sAvg ? (stepsVals[stepsVals.length-1] / sAvg) : 1;
    let stepsScore = 1.0; if (rel>1.35) stepsScore=.8; else if (rel<0.6) stepsScore=.86; else if (rel<0.85||rel>1.15) stepsScore=.94;
    return Math.round(100*(0.5*sleepScore + 0.3*hrScore + 0.2*stepsScore));
  }, [sleepDates, sleepByDate, hr7, steps7]);

  // Trend datasets
  const hrLabels = hr7.map(r => r.date);
  const hrAvg = hr7.map(r => (r.avg_bpm != null ? r.avg_bpm : null));
  const hrMin = hr7.map(r => (r.min_bpm != null ? r.min_bpm : null));
  const hrMax = hr7.map(r => (r.max_bpm != null ? r.max_bpm : null));

  const stepsLabels = steps7.map(r => r.date);
  const stepsVals = steps7.map(r => r.steps || 0);

  const calLabels = cal7.map(r => r.date);
  const calVals = cal7.map(r => r.kcal || 0);

  const hrDayLabels = hrIntra.map(s => dayjs(s.ts).format('HH:mm'));
  const hrDayVals = hrIntra.map(s => s.avg_bpm);

  // chat
  const sendMsg = async () => {
    const text = msg.trim();
    if (!text) return;
    setChatLog(prev => prev + `\n\nYou: ${text}`);
    setMsg('');
    try {
      const res = await postChat(text);
      if (res.response) setChatLog(prev => prev + `\n\nCoach: ${res.response}`);
      if (res.viz) setAiSpec(res.viz);
    } catch (e) {
      setChatLog(prev => prev + `\n\n⚠️ ${e.message}`);
    }
  };

  const syncNow = async () => {
    setChatLog(prev => prev + `\n\nSyncing Google Fit…`);
    try {
      const j = await postSync();
      setChatLog(prev => prev + `\n\n✅ ${j.message || 'Sync complete'}`);
      // reload charts
      const [sleepJ, hr7J, hrDayJ, stepsJ, calJ] = await Promise.all([
        getSleepDebug(), getHRLast7(), getHRIntraday(), getStepsLast7(), getCaloriesLast7()
      ]);
      setSleepRows(sleepJ.data || []);
      setHr7(hr7J.data || []);
      setHrIntra(hrDayJ.samples || []);
      setSteps7(stepsJ.data || []);
      setCal7(calJ.data || []);
    } catch (e) {
      setChatLog(prev => prev + `\n\n⚠️ Sync failed: ${e.message}`);
    }
  };

  return (
    <div className="wrap">
      <header>
        <h1>🟢 Health Coach</h1>
        <span className="pill">Model: {model.reachable ? (model.configured ? `Ollama: ${model.model}` : 'reachable') : 'offline'}</span>
        <span className="pill">Local time: {new Date().toTimeString().slice(0,8)}</span>
      </header>

      <div className="grid">
        <div className="panel">
          <h3>Readiness</h3>
          <div className="gauge-wrap">
            <ReadinessGauge score={readiness} />
          </div>
          <div className="kpis">
            <div className="kpi"><small>Sleep (last night)</small><strong>{kpiSleepMin}</strong></div>
            <div className="kpi"><small>HR (yesterday avg)</small><strong>{kpiHr}</strong></div>
            <div className="kpi"><small>Steps (yesterday)</small><strong>{kpiSteps}</strong></div>
            <div className="kpi"><small>Calories (yesterday)</small><strong>{kpiCal}</strong></div>
          </div>
          <div className="tiny muted" style={{marginTop:8}}>
            Readiness = 50% sleep, 30% HR vs 7-day avg, 20% steps vs 7-day avg.
          </div>
        </div>

        <div className="panel">
          <h3>Coach</h3>
          <div id="chatlog" className="muted" style={{whiteSpace:'pre-wrap', minHeight:160}}>{chatLog}</div>
          <div className="row" style={{marginTop:12}}>
            <input className="input" placeholder="Type your message..." value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') sendMsg(); }} />
            <button className="btn" onClick={sendMsg}>Send</button>
          </div>
          <div className="row" style={{marginTop:12}}>
            <button className="btn secondary" onClick={syncNow}>Sync Google Fit</button>
          </div>
        </div>
      </div>

      <div className="panel" style={{marginTop:16}}>
        <h3>Trends</h3>
        <div className="subgrid">
          <div className="panel">
            <h3 style={{marginTop:0}}>Sleep Stages • Last 7 days</h3>
            <StackedBar labels={sleepDates} datasets={sleepDatasets} />
            <div className="tiny muted">Stacked minutes by stage (Awake excluded).</div>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>Heart Rate • Last 7 days</h3>
            <TrendLine labels={hrLabels} datasets={[
              {label:'Avg', data:hrAvg, tension:.35},
              {label:'Min', data:hrMin, borderDash:[4,3], tension:.35},
              {label:'Max', data:hrMax, borderDash:[4,3], tension:.35},
            ]}/>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>Steps • Last 7 days</h3>
            <TrendLine labels={stepsLabels} datasets={[{label:'Steps', data:stepsVals, tension:.35}]}/>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>Calories • Last 7 days</h3>
            <TrendLine labels={calLabels} datasets={[{label:'Total kcal', data:calVals, tension:.35}]}/>
          </div>
        </div>
      </div>

      <div className="panel" style={{marginTop:16}}>
        <h3>Today & Predictive Insights</h3>
        <div className="subgrid">
          <div className="panel">
            <h3 style={{marginTop:0}}>Intraday HR (5-min buckets)</h3>
            <TrendLine labels={hrDayLabels} datasets={[{label:'Avg BPM', data:hrDayVals, tension:.35}]}/>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>Sleep Debt vs Goal (last 7 days)</h3>
            <TrendLine labels={sleepDates} datasets={[{
              label:'Δ minutes vs 8h goal',
              data: sleepDates.map(d => ['Light sleep','Deep sleep','REM sleep'].reduce((a,s)=> a+(sleepByDate[d]?.[s]||0), 0) - 480),
              tension:.35
            }]}/>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>Readiness Projection (next 3 days)</h3>
            <TrendLine labels={[...sleepDates.slice(-3),'D+1','D+2','D+3']} datasets={[{
              label:'Readiness',
              data:(() => {
                const goal = 480;
                const hist = sleepDates.map((d,i) => {
                  const m = ['Light sleep','Deep sleep','REM sleep'].reduce((a,s)=>a+(sleepByDate[d]?.[s]||0),0);
                  const sleepScore = Math.max(0, Math.min(1, (m/goal)));
                  const hrIdx = Math.max(0, hrLabels.indexOf(d));
                  const avg = hr7.map(r=>r.avg_bpm).filter(v=>v!=null);
                  const weekly = avg.length ? avg.reduce((a,b)=>a+b,0)/avg.length : 0.9;
                  const h = hrIdx<hr7.length && hr7[hrIdx].avg_bpm!=null ? Math.max(0, Math.min(1, 1-((hr7[hrIdx].avg_bpm-weekly)/20))) : 0.9;
                  const sVal = steps7[hrIdx] ? steps7[hrIdx].steps : (steps7[steps7.length-1]?.steps||0);
                  const sAvg = steps7.length ? steps7.map(r=>r.steps||0).reduce((a,b)=>a+b,0)/steps7.length : sVal;
                  const rel = sAvg ? (sVal/sAvg) : 1;
                  let st = 1.0; if (rel>1.35) st=.8; else if (rel<0.6) st=.86; else if (rel<0.85||rel>1.15) st=.94;
                  return Math.round(100*(0.5*sleepScore + 0.3*h + 0.2*st));
                });
                const lastR = hist.length ? hist[hist.length-1] : 70;
                const meanR = hist.length ? Math.round(hist.reduce((a,b)=>a+b,0)/hist.length) : 70;
                const proj1 = Math.round(0.6*lastR + 0.4*meanR);
                const proj2 = Math.round(0.6*proj1 + 0.4*meanR);
                const proj3 = Math.round(0.6*proj2 + 0.4*meanR);
                return [...hist.slice(-3), proj1, proj2, proj3];
              })(),
              tension:.35
            }]}/>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>AI Chart (from Coach)</h3>
            <AIChart spec={aiSpec}/>
          </div>
        </div>
      </div>
    </div>
  );
}
