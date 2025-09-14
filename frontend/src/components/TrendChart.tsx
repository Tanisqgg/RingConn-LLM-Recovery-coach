import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface TrendChartProps {
  title: string;
  data: any[];
  type: 'line' | 'area' | 'bar';
  dataKey: string;
  color: string;
  unit?: string;
  showValue?: boolean;
}

export function TrendChart({ title, data, type, dataKey, color, unit, showValue = true }: TrendChartProps) {
  const currentValue = data[data.length - 1]?.[dataKey];

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
            />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="bg-dark-card rounded-2xl p-4 dark-shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-dark-secondary">{title}</h4>
        {showValue && currentValue && (
          <div className="text-right">
            <div className="text-lg font-bold text-dark-primary">
              {currentValue}{unit}
            </div>
          </div>
        )}
      </div>
      
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}