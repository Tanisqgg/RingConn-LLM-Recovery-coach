import React from 'react';
import { AppleCard } from './AppleCard';
import { X, Moon, Zap, Heart, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useHealthData } from '../hooks/useHealthData';
import { processWeeklySleepData } from '../lib/transform';

interface SleepTrendsDetailProps {
  onClose: () => void;
}

export function SleepTrendsDetail({ onClose }: SleepTrendsDetailProps) {
  const { sleepRows, loading, error } = useHealthData();
  
  // Process real sleep data
  const { weeklyData, averages, validDaysCount } = processWeeklySleepData(sleepRows);

  const getSleepStageColor = (stage: string) => {
    switch (stage) {
      case 'deep': return '#8B5CF6';
      case 'rem': return '#06D6A0';
      case 'light': return '#6366F1';
      default: return '#8E8E93';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-end">
        <div className="w-full max-w-md bg-dark-bg h-full overflow-y-auto">
          <div className="p-4 space-y-6 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-oura-sleep/20 rounded-full flex items-center justify-center">
                  <Moon className="w-5 h-5 text-oura-sleep" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Sleep Trends</h2>
                  <p className="text-sm text-dark-secondary">Loading...</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-secondary" />
              </button>
            </div>
            <div className="flex items-center justify-center py-20">
              <div className="text-dark-secondary">Loading sleep data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-end">
        <div className="w-full max-w-md bg-dark-bg h-full overflow-y-auto">
          <div className="p-4 space-y-6 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-oura-sleep/20 rounded-full flex items-center justify-center">
                  <Moon className="w-5 h-5 text-oura-sleep" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Sleep Trends</h2>
                  <p className="text-sm text-dark-secondary">Error loading data</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-secondary" />
              </button>
            </div>
            <div className="flex items-center justify-center py-20">
              <div className="text-red-400 text-center">
                <p>Failed to load sleep data</p>
                <p className="text-sm text-dark-secondary mt-2">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-end">
      <div className="w-full max-w-md bg-dark-bg h-full overflow-y-auto">
        <div className="p-4 space-y-6 max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-oura-sleep/20 rounded-full flex items-center justify-center">
                <Moon className="w-5 h-5 text-oura-sleep" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Sleep Trends</h2>
                <p className="text-sm text-dark-secondary">Past 7 days</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-secondary" />
            </button>
          </div>

          {/* Weekly Overview */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-dark-secondary">Avg Sleep Duration</p>
                <p className="text-2xl font-semibold text-white">{averages.totalSleep}h</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">+12m vs last week</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-dark-secondary">Avg Efficiency</p>
                <p className="text-2xl font-semibold text-white">{averages.efficiency}%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">+2% vs last week</span>
                </div>
              </div>
            </div>
          </AppleCard>

          {/* Sleep Score Trend */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Score Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[70, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-dark-secondary mt-2">
              Average score: <span className="text-oura-sleep font-semibold">{averages.score}</span>
            </p>
          </AppleCard>

          {/* Sleep Duration by Day */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Duration</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[6, 10]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <Bar dataKey="totalSleep" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#8B5CF6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppleCard>

          {/* Sleep Stages Breakdown */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Stages This Week</h3>
            <div className="space-y-4">
              {weeklyData.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{day.day}</span>
                    <span className="text-sm text-dark-secondary">{day.date}</span>
                  </div>
                  {day.hasData ? (
                    <>
                      <div className="flex rounded-lg overflow-hidden h-6">
                        <div 
                          className="bg-oura-sleep" 
                          style={{ width: `${(day.deepSleep / day.totalSleep) * 100}%` }}
                        />
                        <div 
                          className="bg-oura-activity" 
                          style={{ width: `${(day.remSleep / day.totalSleep) * 100}%` }}
                        />
                        <div 
                          className="bg-oura-readiness" 
                          style={{ width: `${(day.lightSleep / day.totalSleep) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-dark-secondary">
                        <span>Deep: {day.deepSleep}h</span>
                        <span>REM: {day.remSleep}h</span>
                        <span>Light: {day.lightSleep}h</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-6 bg-dark-hover rounded-lg">
                      <span className="text-xs text-dark-secondary">No data for that night</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-dark-hover rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">
                Weekly Averages {validDaysCount > 0 && `(${validDaysCount} days)`}
              </h4>
              {validDaysCount > 0 ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-secondary">Deep Sleep</span>
                    <span className="text-oura-sleep font-semibold">{averages.deepSleep}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-secondary">REM Sleep</span>
                    <span className="text-oura-activity font-semibold">{averages.remSleep}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-secondary">Light Sleep</span>
                    <span className="text-oura-readiness font-semibold">{averages.totalSleep - averages.deepSleep - averages.remSleep}h</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-dark-secondary text-sm">No sleep data available for this week</span>
                </div>
              )}
            </div>
          </AppleCard>

          {/* Sleep Insights */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Insights</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Excellent Deep Sleep</p>
                  <p className="text-xs text-dark-secondary">Your deep sleep percentage is above optimal range (20-23%)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="w-4 h-4 text-oura-sleep mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Consistent Sleep Schedule</p>
                  <p className="text-xs text-dark-secondary">Your bedtime variance is within 30 minutes this week</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Improving Trend</p>
                  <p className="text-xs text-dark-secondary">Sleep efficiency has improved by 2% compared to last week</p>
                </div>
              </div>
            </div>
          </AppleCard>
        </div>
      </div>
    </div>
  );
}