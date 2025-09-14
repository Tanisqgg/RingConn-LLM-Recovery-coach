import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

const sleepData = [
  { stage: 'Deep', minutes: 92, color: '#59ffa2' },
  { stage: 'REM', minutes: 68, color: '#60a5fa' },
  { stage: 'Light', minutes: 186, color: '#f472b6' },
  { stage: 'Awake', minutes: 14, color: '#facc15' }
];

export function SleepStagesChart() {
  const totalSleep = sleepData.reduce((sum, item) => sum + item.minutes, 0);
  const sleepHours = Math.floor(totalSleep / 60);
  const sleepMinutes = totalSleep % 60;

  return (
    <div className="bg-dark-card rounded-2xl p-6 dark-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-primary">Sleep Stages</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-dark-primary">
            {sleepHours}h {sleepMinutes}m
          </div>
          <div className="text-sm text-dark-secondary">Total Sleep</div>
        </div>
      </div>

      <div className="h-32 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sleepData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="stage" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94A3B8' }}
            />
            <YAxis hide />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
              {sleepData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sleepData.map((stage, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <div className="flex-1">
              <div className="text-sm text-dark-primary font-medium">
                {Math.floor(stage.minutes / 60)}h {stage.minutes % 60}m
              </div>
              <div className="text-xs text-dark-secondary">
                {stage.stage}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}