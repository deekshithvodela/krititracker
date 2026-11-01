import React from 'react';
import { Card } from '../ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  trend?: {
    label: string;
    positive?: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-primary-50',
  iconColor = 'text-primary-600',
  trend,
}) => {
  return (
    <Card className="p-5 hover:shadow-card transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-sans">
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            <span className={trend.positive ? 'text-emerald-600' : 'text-slate-500'}>
              {trend.label}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
