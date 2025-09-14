import React from 'react';
import { ReadinessGauge } from './ReadinessGauge';
import { MetricCard } from './MetricCard';
import { AICoachChat } from './AICoachChat';
import { TrendChart } from './TrendChart';
import { SleepStagesChart } from './SleepStagesChart';
import { Activity, Heart, Footprints, Zap, Moon, TrendingUp } from 'lucide-react';

// Mock data for charts
const heartRateData = [
  { name: 'Mon', value: 62 },
  { name: 'Tue', value: 58 },
  { name: 'Wed', value: 61 },
  { name: 'Thu', value: 59 },
  { name: 'Fri', value: 56 },
  { name: 'Sat', value: 60 },
  { name: 'Sun', value: 58 }
];

const stepsData = [
  { name: 'Mon', value: 8420 },
  { name: 'Tue', value: 12350 },
  { name: 'Wed', value: 9870 },
  { name: 'Thu', value: 11240 },
  { name: 'Fri', value: 10150 },
  { name: 'Sat', value: 15680 },
  { name: 'Sun', value: 7520 }
];

const caloriesData = [
  { name: 'Mon', value: 2140 },
  { name: 'Tue', value: 2580 },
  { name: 'Wed', value: 2320 },
  { name: 'Thu', value: 2690 },
  { name: 'Fri', value: 2450 },
  { name: 'Sat', value: 2890 },
  { name: 'Sun', value: 2180 }
];

const htvData = [
  { name: 'Mon', value: 42 },
  { name: 'Tue', value: 38 },
  { name: 'Wed', value: 45 },
  { name: 'Thu', value: 41 },
  { name: 'Fri', value: 48 },
  { name: 'Sat', value: 52 },
  { name: 'Sun', value: 49 }
];

export function HealthDashboard() {
  const currentTime = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className="min-h-screen bg-dark-bg p-4 lg:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-primary mb-1">
            HealthSync Pro
          </h1>
          <p className="text-dark-secondary">Your personal wellness companion</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-neon-green/20 text-neon-green rounded-full text-sm font-medium">
            Oura Ring Connected
          </div>
          <div className="px-3 py-1 bg-dark-tag text-dark-secondary rounded-full text-sm font-medium">
            {currentTime}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Readiness Panel - Left Column */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-dark-card rounded-2xl p-6 dark-shadow">
            <div className="text-center mb-6">
              <ReadinessGauge score={87} title="Readiness Score" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="Resting HR"
                value="58"
                unit="bpm"
                trend="down"
                trendValue="↓2"
                accentColor="green"
              />
              <MetricCard
                title="HRV"
                value="49"
                unit="ms"
                trend="up"
                trendValue="↑7"
                accentColor="blue"
              />
              <MetricCard
                title="Body Temp"
                value="97.8"
                unit="°F"
                trend="neutral"
                trendValue="→0"
                accentColor="pink"
              />
              <MetricCard
                title="Recovery"
                value="85"
                unit="%"
                trend="up"
                trendValue="↑5"
                accentColor="yellow"
              />
            </div>
          </div>

          {/* AI Coach Chat */}
          <AICoachChat />
        </div>

        {/* Trends Grid - Right Column */}
        <div className="xl:col-span-8 space-y-6">
          {/* Sleep Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SleepStagesChart />
            
            <div className="bg-dark-card rounded-2xl p-6 dark-shadow">
              <div className="flex items-center gap-3 mb-4">
                <Moon className="w-5 h-5 text-neon-blue" />
                <h3 className="text-lg font-semibold text-dark-primary">Sleep Quality</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-dark-secondary">Sleep Score</span>
                  <span className="text-2xl font-bold text-neon-green">92</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-secondary">Efficiency</span>
                  <span className="text-lg font-semibold text-dark-primary">96%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-secondary">Restfulness</span>
                  <span className="text-lg font-semibold text-dark-primary">8.4/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-secondary">Sleep Debt</span>
                  <span className="text-lg font-semibold text-neon-yellow">-12m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TrendChart
              title="Resting Heart Rate"
              data={heartRateData}
              type="line"
              dataKey="value"
              color="#59ffa2"
              unit=" bpm"
            />
            <TrendChart
              title="Daily Steps"
              data={stepsData}
              type="bar"
              dataKey="value"
              color="#60a5fa"
              unit=" steps"
            />
            <TrendChart
              title="Calories Burned"
              data={caloriesData}
              type="area"
              dataKey="value"
              color="#f472b6"
              unit=" cal"
            />
            <TrendChart
              title="Heart Rate Variability"
              data={htvData}
              type="line"
              dataKey="value"
              color="#facc15"
              unit=" ms"
            />
          </div>

          {/* Insights Panel */}
          <div className="bg-dark-card rounded-2xl p-6 dark-shadow">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-neon-pink" />
              <h3 className="text-lg font-semibold text-dark-primary">AI Insights & Projections</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-dark-primary">Today's Outlook</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-neon-green rounded-full"></div>
                    <span className="text-sm text-dark-secondary">Optimal workout window: 2-4 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
                    <span className="text-sm text-dark-secondary">Stress levels trending low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-neon-yellow rounded-full"></div>
                    <span className="text-sm text-dark-secondary">Hydration reminder at 3 PM</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-dark-primary">Weekly Trends</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-dark-secondary">Recovery improving</span>
                    <span className="text-sm text-neon-green">+12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-dark-secondary">Activity consistency</span>
                    <span className="text-sm text-neon-blue">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-dark-secondary">Sleep quality</span>
                    <span className="text-sm text-neon-green">+8%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-dark-primary">Recommendations</h4>
                <div className="space-y-2">
                  <div className="text-sm text-dark-secondary">
                    • Try 10min meditation before bed
                  </div>
                  <div className="text-sm text-dark-secondary">  
                    • Increase protein intake by 15g
                  </div>
                  <div className="text-sm text-dark-secondary">
                    • Schedule recovery day Thursday
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}