import React from 'react';

interface OuraRingProps {
  score: number;
  title: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function OuraRing({ score, title, color, size = 'md', showScore = true }: OuraRingProps) {
  const getSizes = () => {
    switch (size) {
      case 'sm': return { w: 80, h: 80, stroke: 6, radius: 34, text: 'text-lg', subtitle: 'text-xs' };
      case 'lg': return { w: 160, h: 160, stroke: 12, radius: 68, text: 'text-4xl', subtitle: 'text-sm' };
      default: return { w: 120, h: 120, stroke: 8, radius: 52, text: 'text-2xl', subtitle: 'text-xs' };
    }
  };

  const { w, h, stroke, radius, text, subtitle } = getSizes();
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={w} height={h} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={w / 2}
          cy={h / 2}
          r={radius}
          stroke="rgba(142, 142, 147, 0.2)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={w / 2}
          cy={h / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showScore && (
          <div className={`${text} font-semibold text-white mb-1`}>
            {score}
          </div>
        )}
        <div className={`${subtitle} text-dark-secondary font-medium text-center px-2`}>
          {title}
        </div>
      </div>
    </div>
  );
}