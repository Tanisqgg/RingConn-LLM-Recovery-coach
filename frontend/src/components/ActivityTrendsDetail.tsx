import React from 'react';
import { AppleCard } from './AppleCard';
import { X, Activity, Zap, Target, TrendingUp, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell, Area, AreaChart } from 'recharts';

interface ActivityTrendsDetailProps {
  onClose: () => void;
}

export function ActivityTrendsDetail({ onClose }: ActivityTrendsDetailProps) {
  // Mock data for the past week
  const weeklyData = [
    { day: 'Mon', date: 'Dec 9', steps: 12450, calories: 2240, activeMinutes: 85, heartRate: 72, activityScore: 82 },
    { day: 'Tue', date: 'Dec 10', steps: 9800, calories: 2180, activeMinutes: 60, heartRate: 68, activityScore: 75 },
    { day: 'Wed', date: 'Dec 11', steps: 15200, calories: 2420, activeMinutes: 95, heartRate: 74, activityScore: 88 },
    { day: 'Thu', date: 'Dec 12', steps: 11300, calories: 2280, activeMinutes: 75, heartRate: 70, activityScore: 79 },
    { day: 'Fri', date: 'Dec 13', steps: 13600, calories: 2350, activeMinutes: 88, heartRate: 73, activityScore: 85 },
    { day: 'Sat', date: 'Dec 14', steps: 8900, calories: 2150, activeMinutes: 45, heartRate: 65, activityScore: 68 },
    { day: 'Sun', date: 'Dec 15', steps: 16800, calories: 2480, activeMinutes: 105, heartRate: 76, activityScore: 92 }
  ];

  const averages = {
    steps: 12579,
    calories: 2300,
    activeMinutes: 79,
    heartRate: 71,
    activityScore: 81.3
  };

  const getActivityLevel = (score: number) => {
    if (score >= 85) return { level: 'High', color: 'text-green-500' };
    if (score >= 70) return { level: 'Moderate', color: 'text-yellow-500' };
    return { level: 'Low', color: 'text-red-500' };
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-end">
      <div className="w-full max-w-md bg-dark-bg h-full overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-oura-activity/20 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-oura-activity" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Activity Trends</h2>
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
                <p className="text-sm text-dark-secondary">Daily Steps</p>
                <p className="text-2xl font-semibold text-white">{averages.steps.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">+8% vs last week</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-dark-secondary">Active Minutes</p>
                <p className="text-2xl font-semibold text-white">{averages.activeMinutes}min</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">+15min vs last week</span>
                </div>
              </div>
            </div>
          </AppleCard>

          {/* Activity Score Trend */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Activity Score Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06D6A0" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[60, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activityScore"
                    stroke="#06D6A0"
                    strokeWidth={3}
                    fill="url(#activityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-dark-secondary mt-2">
              Average score: <span className="text-oura-activity font-semibold">{averages.activityScore.toFixed(1)}</span>
            </p>
          </AppleCard>

          {/* Steps and Calories */}
          <div className="grid grid-cols-1 gap-4">
            <AppleCard>
              <h3 className="text-lg font-semibold text-white mb-4">Steps This Week</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8E8E93', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8E8E93', fontSize: 12 }}
                    />
                    <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                      {weeklyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#06D6A0" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AppleCard>

            <AppleCard>
              <h3 className="text-lg font-semibold text-white mb-4">Calories Burned</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8E8E93', fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[2000, 2500]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8E8E93', fontSize: 12 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calories" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AppleCard>
          </div>

          {/* Daily Activity Breakdown */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Daily Activity Levels</h3>
            <div className="space-y-4">
              {weeklyData.map((day, index) => {
                const activityLevel = getActivityLevel(day.activityScore);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-oura-activity/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-oura-activity">{day.day.substring(0, 1)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{day.day}</p>
                        <p className="text-xs text-dark-secondary">{day.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{day.activityScore}</p>
                      <p className={`text-xs ${activityLevel.color}`}>{activityLevel.level}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppleCard>

          {/* Heart Rate Trend */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Resting Heart Rate</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[60, 80]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 12 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="heartRate" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-dark-secondary mt-2">
              Average: <span className="text-red-500 font-semibold">{averages.heartRate} bpm</span>
            </p>
          </AppleCard>

          {/* Activity Insights */}
          <AppleCard>
            <h3 className="text-lg font-semibold text-white mb-4">Activity Insights</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Goal Achievement</p>
                  <p className="text-xs text-dark-secondary">You hit your step goal 5 out of 7 days this week</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Flame className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Most Active Day</p>
                  <p className="text-xs text-dark-secondary">Sunday with 16,800 steps and 105 active minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Weekly Progress</p>
                  <p className="text-xs text-dark-secondary">Activity levels increased by 8% compared to last week</p>
                </div>
              </div>
            </div>
          </AppleCard>
        </div>
      </div>
    </div>
  );
}