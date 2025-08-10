import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Brain, Clock, Moon, RefreshCw, Sparkles, Sun, Waves } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Cell } from "recharts";

// -----------------------------
// Types
// -----------------------------
type SleepStage = "Awake (in bed)" | "Sleep" | "Out-of-bed" | "Light sleep" | "Deep sleep" | "REM sleep";

type StageSegment = {
  start: string; // ISO
  end: string;   // ISO
  stage: SleepStage;
};

type DailySummary = {
  date: string;               // YYYY-MM-DD
  totalMinutes: number;       // total sleep duration
  efficiency?: number;        // 0-1
  score?: number;             // 0-100 (computed if absent)
  stages: Record<string, number>; // minutes by stage
};

type CoachMessage = { text: string };

type HRPoint = { t: string; bpm: number };

// -----------------------------
// Helpers
// -----------------------------
const stagePalette: Record<string, string> = {
  "Awake (in bed)": "#EAB308", // amber
  Sleep: "#64748B", // slate
  "Out-of-bed": "#94A3B8", // light slate
  "Light sleep": "#38BDF8", // sky
  "Deep sleep": "#6366F1", // indigo
  "REM sleep": "#10B981", // emerald
};

function minutesBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

function formatHM(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h ${m}m`;
}

function computeScore(d: DailySummary) {
  // Simple heuristic score (oura-like feel): weights for deep, rem, duration, efficiency
  const deep = (d.stages["Deep sleep"] || 0) / 90;  // target ~90 min
  const rem = (d.stages["REM sleep"] || 0) / 100;   // target ~100 min
  const dur = d.totalMinutes / 450;                  // target ~7.5h
  const eff = (d.efficiency ?? 0.88) / 0.92;         // target 92%
  const raw = 0.35 * deep + 0.35 * rem + 0.2 * dur + 0.1 * eff;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

// Hypnogram transform: split segments into 5‑min bins
function toHypnogram(segments: StageSegment[]) {
  const bins: { t: string; stage: SleepStage }[] = [];
  segments.forEach((s) => {
    let cur = new Date(s.start).getTime();
    const end = new Date(s.end).getTime();
    const step = 5 * 60 * 1000;
    while (cur < end) {
      bins.push({ t: new Date(cur).toISOString(), stage: s.stage });
      cur += step;
    }
  });
  return bins.map((b, i) => ({ index: i, label: new Date(b.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), [b.stage]: 1 }));
}

function useMockIfNeeded<T>(fetcher: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetcher();
        if (!mounted) return;
        setData(res);
      } catch (e: any) {
        setError(e?.message || "Failed to load. Showing sample data.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error, setData } as const;
}

// -----------------------------
// API fetchers (expects you to wire these to your Python backend)
// -----------------------------
async function fetchDailySummary(): Promise<DailySummary> {
  const r = await fetch("/api/sleep/summary");
  if (!r.ok) throw new Error("/api/sleep/summary HTTP " + r.status);
  return r.json();
}

async function fetchSegments(): Promise<StageSegment[]> {
  const r = await fetch("/api/sleep/segments");
  if (!r.ok) throw new Error("/api/sleep/segments HTTP " + r.status);
  return r.json();
}

async function fetchHR(): Promise<HRPoint[]> {
  const r = await fetch("/api/hr/night");
  if (!r.ok) throw new Error("/api/hr/night HTTP " + r.status);
  return r.json();
}

async function fetchCoach(): Promise<CoachMessage[]> {
  const r = await fetch("/api/coach/messages");
  if (!r.ok) throw new Error("/api/coach/messages HTTP " + r.status);
  return r.json();
}

// -----------------------------
// Mock data (used automatically when API not ready)
// -----------------------------
const mockSegments: StageSegment[] = [
  { start: new Date(Date.now() - 7.5 * 3600 * 1000).toISOString(), end: new Date(Date.now() - 7.0 * 3600 * 1000).toISOString(), stage: "Light sleep" },
  { start: new Date(Date.now() - 7.0 * 3600 * 1000).toISOString(), end: new Date(Date.now() - 5.8 * 3600 * 1000).toISOString(), stage: "Deep sleep" },
  { start: new Date(Date.now() - 5.8 * 3600 * 1000).toISOString(), end: new Date(Date.now() - 4.3 * 3600 * 1000).toISOString(), stage: "Light sleep" },
  { start: new Date(Date.now() - 4.3 * 3600 * 1000).toISOString(), end: new Date(Date.now() - 3.2 * 3600 * 1000).toISOString(), stage: "REM sleep" },
  { start: new Date(Date.now() - 3.2 * 3600 * 1000).toISOString(), end: new Date(Date.now() - 3.0 * 3600 * 1000).toISOString(), stage: "Awake (in bed)" },
  { start: new Date(Date.now() - 3.0 * 3600 * 1000).toISOString(), end: new Date(Date.now() - 0.0 * 3600 * 1000).toISOString(), stage: "Light sleep" },
];

const mockSummary: DailySummary = {
  date: new Date().toISOString().slice(0, 10),
  totalMinutes: Math.round(minutesBetween(mockSegments[0].start, mockSegments[mockSegments.length - 1].end)),
  efficiency: 0.91,
  stages: {
    "Light sleep": 250,
    "Deep sleep": 92,
    "REM sleep": 95,
    "Awake (in bed)": 14,
  },
};
mockSummary.score = computeScore(mockSummary);

const mockHR: HRPoint[] = new Array(60).fill(0).map((_, i) => ({
  t: new Date(Date.now() - (60 - i) * 5 * 60 * 1000).toISOString(),
  bpm: 45 + Math.round(8 * Math.sin(i / 6) + Math.random() * 4),
}));

const mockCoach: CoachMessage[] = [
  { text: "Great job! No significant sleep anomalies detected last night." },
  { text: "You got 92 min of deep sleep — keep that wind‑down routine going." },
  { text: "Light sleep a bit high; try reducing late‑night screen time." },
];

// -----------------------------
// UI bits
// -----------------------------
function ScoreRing({ score }: { score: number }) {
  const radius = 84;
  const stroke = 14;
  const C = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * C;
  return (
    <div className="relative w-48 h-48">
      <svg viewBox="0 0 200 200" className="rotate-[-90deg]">
        <circle cx="100" cy="100" r={radius} strokeWidth={stroke} stroke="#0F172A" fill="none" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#grad)"
          strokeDasharray={`${dash} ${C - dash}`}
          fill="none"
        />
        <defs>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-5xl font-semibold">{score}</div>
          <div className="text-sm text-slate-400">Sleep Score</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-slate-900/70 border-slate-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-800">{icon}</div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
          {sub && <div className="text-xs text-slate-400">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// Main component
// -----------------------------
export default function SleepCoachDashboard() {
  const { data: summary, loading: loadingSummary } = useMockIfNeeded(fetchDailySummary, mockSummary);
  const { data: segments } = useMockIfNeeded(fetchSegments, mockSegments);
  const { data: hr } = useMockIfNeeded(fetchHR, mockHR);
  const { data: coach } = useMockIfNeeded(fetchCoach, mockCoach);

  const hypnogram = useMemo(() => toHypnogram(segments), [segments]);

  const stageTotals = useMemo(() => {
    const entries = Object.entries(summary.stages || {});
    return entries.map(([name, minutes]) => ({ name, minutes }));
  }, [summary]);

  const totalSleep = formatHM(summary.totalMinutes || 0);
  const remMin = summary.stages["REM sleep"] || 0;
  const deepMin = summary.stages["Deep sleep"] || 0;
  const efficiencyPct = Math.round((summary.efficiency ?? 0.9) * 100);
  const score = summary.score ?? computeScore(summary);

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs tracking-widest text-slate-400 uppercase">RingConn Coach</div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Sleep</h1>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search insights" className="bg-slate-900 border-slate-800 w-44 hidden md:block" />
              <Button variant="secondary" className="bg-slate-800 border-slate-700" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>

          {/* Top grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-slate-900/70 border-slate-800">
              <CardContent className="p-6 flex items-center justify-center">
                <ScoreRing score={score} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:col-span-2 gap-4">
              <Stat icon={<Moon className="w-5 h-5 text-sky-300" />} label="Total Sleep" value={totalSleep} />
              <Stat icon={<Brain className="w-5 h-5 text-emerald-300" />} label="REM" value={`${remMin} min`} />
              <Stat icon={<Waves className="w-5 h-5 text-indigo-300" />} label="Deep" value={`${deepMin} min`} />
              <Stat icon={<Activity className="w-5 h-5 text-fuchsia-300" />} label="Efficiency" value={`${efficiencyPct}%`} />
            </div>
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-900/70 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-slate-300">Hypnogram</h3>
                  <div className="text-xs text-slate-500">5‑min bins</div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hypnogram} stackOffset="expand" margin={{ left: -20, right: 10 }}>
                      <CartesianGrid vertical={false} stroke="#0f172a" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8" }} interval={Math.max(0, Math.floor(hypnogram.length / 6))} />
                      <YAxis hide domain={[0, 1]} />
                      <RTooltip contentStyle={{ background: "#0B1220", border: "1px solid #1f2937" }} labelStyle={{ color: "#cbd5e1" }} />
                      {(Object.keys(stagePalette) as SleepStage[]).map((st) => (
                        <Bar key={st} dataKey={st} stackId="1" fill={stagePalette[st] || "#64748B"} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex gap-3 flex-wrap">
                  {Object.entries(stagePalette).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      {name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-sm text-slate-300 mb-3">Stage mix</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RTooltip contentStyle={{ background: "#0B1220", border: "1px solid #1f2937" }} labelStyle={{ color: "#cbd5e1" }} />
                      <Pie dataKey="minutes" data={stageTotals} outerRadius={80}>
                        {stageTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={stagePalette[entry.name] || "#334155"} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {stageTotals.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: stagePalette[s.name] || "#334155" }} />
                        {s.name}
                      </div>
                      <div className="text-slate-400">{formatHM(s.minutes)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HR Trend & Coach */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-900/70 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-slate-300">Resting HR (night)</h3>
                  <div className="text-xs text-slate-500">5‑min samples</div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hr} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid stroke="#0f172a" />
                      <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} tick={{ fill: "#94a3b8" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: "#94a3b8" }} width={35} />
                      <RTooltip contentStyle={{ background: "#0B1220", border: "1px solid #1f2937" }} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                      <Line type="monotone" dataKey="bpm" stroke="#22C55E" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-slate-300">Coach</h3>
                  <Sparkles className="w-4 h-4 text-violet-300" />
                </div>
                <ul className="space-y-2">
                  {coach.map((c, i) => (
                    <li key={i} className="text-sm text-slate-200 flex gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
                      {c.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <Button className="bg-violet-600 hover:bg-violet-500">Play as audio</Button>
                  <Button variant="secondary" className="bg-slate-800 border-slate-700">Save note</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for details / history */}
          <div className="mt-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="bg-slate-900 border border-slate-800">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardContent className="p-6 text-sm text-slate-300 leading-relaxed">
                    Your score is influenced by deep sleep, REM, total duration and efficiency. Keep a consistent wind‑down, dim lights an hour before bed, and avoid screens late night for better REM.
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardContent className="p-6 text-sm text-slate-300">
                    (Coming soon) Seven‑day trends and baseline vs today. Hook to /api/sleep/history for real data.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-500 mt-8 text-center">Built with ❤️ — Oura‑inspired design for RingConn Coach</div>
        </div>
      </div>
    </TooltipProvider>
  );
}