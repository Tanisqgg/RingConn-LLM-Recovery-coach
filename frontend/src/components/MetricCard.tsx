import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor: 'green' | 'blue' | 'pink' | 'yellow';
}

export function MetricCard({ title, value, unit, trend, trendValue, accentColor }: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-neon-green';
    if (trend === 'down') return 'text-dark-negative';
    return 'text-dark-secondary';
  };

  const getAccentClasses = () => {
    switch (accentColor) {
      case 'green': return 'border-neon-green';
      case 'blue': return 'border-neon-blue';
      case 'pink': return 'border-neon-pink';
      case 'yellow': return 'border-neon-yellow';
      default: return 'border-neon-blue';
    }
  };

  return (
    <div className={`bg-dark-card rounded-2xl p-4 border-l-4 ${getAccentClasses()} dark-shadow`}>
      <div className="text-dark-secondary text-sm font-medium mb-2">
        {title}
      </div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-dark-primary">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-dark-secondary">
              {unit}
            </span>
          )}
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}