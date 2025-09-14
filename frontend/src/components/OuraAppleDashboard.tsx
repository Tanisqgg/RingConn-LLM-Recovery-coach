import React, { useState } from 'react';
import { OuraRing } from './OuraRing';
import { AppleCard } from './AppleCard';
import { TrendChart } from './TrendChart';
import { OllamaChat } from './OllamaChat';
import { SyncButton } from './SyncButton';
import { SleepTrendsDetail } from './SleepTrendsDetail';
import { ActivityTrendsDetail } from './ActivityTrendsDetail';
import { Moon, Heart, Activity, Zap, ChevronRight, Bot, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './ui/sonner';
import { useModel } from '../hooks/useModel';
import { useHealthData } from '../hooks/useHealthData';
import { postSync } from '../lib/api';

export function OuraAppleDashboard() {
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [activeTrendPanel, setActiveTrendPanel] = useState<'sleep' | 'activity' | null>(null);
  
  // Fetch data using custom hooks
  const { model, loading: modelLoading } = useModel();
  const { 
    kpis, 
    readiness, 
    chartData, 
    loading: dataLoading, 
    error: dataError, 
    refetch 
  } = useHealthData();
  
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const handleSync = async () => {
    toast.info('Syncing health data from all connected devices...');
    
    try {
      await postSync();
      await refetch(); // Refresh all data after sync
      toast.success('Successfully synced data from Google Fit and other devices');
    } catch (error) {
      toast.error('Failed to sync health data. Please try again.');
      console.error('Sync error:', error);
    }
  };

  // Prepare chart data for trends
  const sleepTrendData = chartData.steps.labels.map((date, index) => ({
    name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    value: chartData.steps.values[index] || 0
  }));

  const activityTrendData = chartData.calories.labels.map((date, index) => ({
    name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    value: chartData.calories.values[index] || 0
  }));

  return (
    <div className="min-h-screen bg-dark-bg relative overflow-hidden">
      {/* Main Content Container */}
      <div className={`transition-transform duration-500 ease-in-out ${
        activeTrendPanel ? '-translate-x-80 sm:-translate-x-96' : 'translate-x-0'
      }`}>
      {/* Header */}
      <header className="px-6 py-8 pb-4">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Summary</h1>
            <p className="text-dark-secondary">{currentTime}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SyncButton onSync={handleSync} className="hidden sm:flex" />
            <SyncButton onSync={handleSync} className="sm:hidden p-2">
              <RefreshCw className="w-4 h-4" />
            </SyncButton>
            <button
              onClick={() => setIsChatMinimized(false)}
              className="bg-oura-readiness/20 text-oura-readiness hover:bg-oura-readiness/30 px-3 py-2 sm:px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Coach</span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Main Rings Section */}
          <AppleCard className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* Readiness Ring */}
              <div className="flex flex-col items-center">
                <OuraRing 
                  score={dataLoading ? 0 : readiness} 
                  title="Readiness" 
                  color="#6366F1" 
                  size="lg"
                />
                <div className="mt-4 text-center">
                  <div className="text-sm text-dark-secondary mb-2">
                    {dataLoading ? 'Loading...' : readiness >= 80 ? 'Excellent' : readiness >= 60 ? 'Good' : 'Fair'}
                  </div>
                  <p className="text-xs text-dark-secondary max-w-xs">
                    {dataLoading ? 'Calculating readiness score...' : 
                     readiness >= 80 ? 'Your body shows excellent signs of recovery. You\'re ready for a productive day.' :
                     readiness >= 60 ? 'Your body shows good signs of recovery. You\'re ready for a productive day.' :
                     'Your body needs more recovery. Consider taking it easy today.'}
                  </p>
                </div>
              </div>

              {/* Sleep Ring */}
              <div className="flex flex-col items-center">
                <OuraRing 
                  score={dataLoading ? 0 : Math.min(100, Math.round((parseInt(kpis.kpiSleepMin) || 0) / 8.5 * 100))} 
                  title="Sleep" 
                  color="#8B5CF6" 
                  size="lg"
                />
                <div className="mt-4 text-center">
                  <div className="text-sm text-dark-secondary mb-2">
                    {dataLoading ? 'Loading...' : Math.min(100, Math.round((parseInt(kpis.kpiSleepMin) || 0) / 8.5 * 100)) >= 90 ? 'Excellent' : 'Good'}
                  </div>
                  <p className="text-xs text-dark-secondary max-w-xs">
                    {dataLoading ? 'Loading sleep data...' : `${kpis.kpiSleepMin} total sleep. ${readiness >= 80 ? 'Great recovery night.' : 'Consider getting more sleep.'}`}
                  </p>
                </div>
              </div>

              {/* Activity Ring */}
              <div className="flex flex-col items-center">
                <OuraRing 
                  score={dataLoading ? 0 : Math.min(100, Math.round((parseInt(kpis.kpiSteps.replace(/,/g, '')) || 0) / 10000 * 100))} 
                  title="Activity" 
                  color="#06D6A0" 
                  size="lg"
                />
                <div className="mt-4 text-center">
                  <div className="text-sm text-dark-secondary mb-2">
                    {dataLoading ? 'Loading...' : Math.min(100, Math.round((parseInt(kpis.kpiSteps.replace(/,/g, '')) || 0) / 10000 * 100)) >= 80 ? 'Excellent' : 'Good'}
                  </div>
                  <p className="text-xs text-dark-secondary max-w-xs">
                    {dataLoading ? 'Loading activity data...' : `${kpis.kpiSteps} steps today. ${parseInt(kpis.kpiSteps.replace(/,/g, '')) >= 8000 ? 'Great activity level!' : 'Consider moving more.'}`}
                  </p>
                </div>
              </div>
            </div>
          </AppleCard>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AppleCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm text-dark-secondary">Resting HR</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {dataLoading ? '--' : kpis.kpiHr.replace(' bpm', '')}
              </div>
              <div className="text-sm text-dark-secondary">bpm</div>
            </AppleCard>

            <AppleCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm text-dark-secondary">Steps</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {dataLoading ? '--' : kpis.kpiSteps}
              </div>
              <div className="text-sm text-dark-secondary">today</div>
            </AppleCard>

            <AppleCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Moon className="w-4 h-4 text-purple-500" />
                </div>
                <span className="text-sm text-dark-secondary">Sleep</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {dataLoading ? '--' : kpis.kpiSleepMin.replace(' min', '')}
              </div>
              <div className="text-sm text-dark-secondary">min</div>
            </AppleCard>

            <AppleCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-sm text-dark-secondary">Calories</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {dataLoading ? '--' : kpis.kpiCal.replace(' kcal', '')}
              </div>
              <div className="text-sm text-dark-secondary">kcal</div>
            </AppleCard>
          </div>

          {/* Trends Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AppleCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Sleep Trends</h3>
                <button 
                  onClick={() => setActiveTrendPanel('sleep')}
                  className="p-1 hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-dark-secondary hover:text-white" />
                </button>
              </div>
              <div className="h-32 mb-4">
                <TrendChart
                  title=""
                  data={sleepTrendData}
                  type="area"
                  dataKey="value"
                  color="#8B5CF6"
                  showValue={false}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-secondary">7-day average</span>
                <span className="text-white font-medium">
                  {dataLoading ? '--' : `${Math.round(sleepTrendData.reduce((a, b) => a + b.value, 0) / sleepTrendData.length)} min`}
                </span>
              </div>
            </AppleCard>

            <AppleCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Activity Trends</h3>
                <button 
                  onClick={() => setActiveTrendPanel('activity')}
                  className="p-1 hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-dark-secondary hover:text-white" />
                </button>
              </div>
              <div className="h-32 mb-4">
                <TrendChart
                  title=""
                  data={activityTrendData}
                  type="area"
                  dataKey="value"
                  color="#06D6A0"
                  showValue={false}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-secondary">7-day average</span>
                <span className="text-white font-medium">
                  {dataLoading ? '--' : `${Math.round(activityTrendData.reduce((a, b) => a + b.value, 0) / activityTrendData.length)} cal`}
                </span>
              </div>
            </AppleCard>
          </div>

          {/* Sleep Breakdown */}
          <AppleCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Last Night's Sleep</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3">
                  <OuraRing 
                    score={78} 
                    title="" 
                    color="#06D6A0" 
                    size="sm"
                    showScore={false}
                  />
                </div>
                <div className="text-lg font-semibold text-white">1h 32m</div>
                <div className="text-sm text-dark-secondary">Deep Sleep</div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3">
                  <OuraRing 
                    score={65} 
                    title="" 
                    color="#8B5CF6" 
                    size="sm"
                    showScore={false}
                  />
                </div>
                <div className="text-lg font-semibold text-white">1h 18m</div>
                <div className="text-sm text-dark-secondary">REM Sleep</div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3">
                  <OuraRing 
                    score={85} 
                    title="" 
                    color="#F59E0B" 
                    size="sm"
                    showScore={false}
                  />
                </div>
                <div className="text-lg font-semibold text-white">5h 34m</div>
                <div className="text-sm text-dark-secondary">Light Sleep</div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3">
                  <OuraRing 
                    score={12} 
                    title="" 
                    color="#FF453A" 
                    size="sm"
                    showScore={false}
                  />
                </div>
                <div className="text-lg font-semibold text-white">14m</div>
                <div className="text-sm text-dark-secondary">Awake</div>
              </div>
            </div>
          </AppleCard>

          {/* Insights */}
          <AppleCard className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-6">Today's Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-dark-hover rounded-xl">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Optimal Workout Window</div>
                  <div className="text-sm text-dark-secondary">Based on your recovery, 2-4 PM is ideal for moderate to high intensity training.</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-dark-hover rounded-xl">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Moon className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Sleep Pattern</div>
                  <div className="text-sm text-dark-secondary">Your sleep timing has been consistent. Try to maintain your 10:30 PM bedtime.</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-dark-hover rounded-xl">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Recovery Status</div>
                  <div className="text-sm text-dark-secondary">Your HRV has improved 15% this week. Great recovery progress!</div>
                </div>
              </div>
            </div>
          </AppleCard>
        </div>
      </div>
      </div>

      {/* Trend Detail Panels */}
      {activeTrendPanel === 'sleep' && (
        <SleepTrendsDetail onClose={() => setActiveTrendPanel(null)} />
      )}
      
      {activeTrendPanel === 'activity' && (
        <ActivityTrendsDetail onClose={() => setActiveTrendPanel(null)} />
      )}

      {/* Ollama Chat Component */}
      <div className={`transition-transform duration-500 ease-in-out ${
        activeTrendPanel ? '-translate-x-80 sm:-translate-x-96' : 'translate-x-0'
      }`}>
        <OllamaChat 
          isMinimized={isChatMinimized}
          onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
        />
      </div>

      {/* Toast Notifications */}
      <Toaster 
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-dark-card)',
            border: '1px solid var(--color-dark-border)',
            color: 'var(--color-dark-primary-text)',
          }
        }}
      />
    </div>
  );
}