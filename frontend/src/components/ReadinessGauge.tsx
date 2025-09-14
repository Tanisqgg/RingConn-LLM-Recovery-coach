import React from 'react';

interface ReadinessGaugeProps {
  score: number;
  title: string;
}

export function ReadinessGauge({ score, title }: ReadinessGaugeProps) {
  const circumference = 2 * Math.PI * 90;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#59ffa2';
    if (score >= 60) return '#facc15';
    if (score >= 40) return '#f472b6';
    return '#ef4444';
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke={getScoreColor(score)}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${getScoreColor(score)}40)`
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-dark-primary mb-1">
          {score}%
        </div>
        <div className="text-sm text-dark-secondary font-medium">
          {title}
        </div>
      </div>
    </div>
  );
}