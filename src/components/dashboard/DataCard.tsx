"use client";

import type { MetricConfig, MetricStatus } from '@/types/airQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TriangleAlert } from 'lucide-react';

interface DataCardProps {
  metricConfig: MetricConfig;
  value: number | null;
  status: MetricStatus;
}

export function DataCard({ metricConfig, value, status }: DataCardProps) {
  const { label, unit, Icon } = metricConfig;

  const cardBorderColor = () => {
    switch (status) {
      case 'normal':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'danger':
        return 'border-red-500';
      default:
        return 'border-muted';
    }
  };
  
  const valueColor = () => {
    switch (status) {
      case 'normal':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const isCritical = status === 'warning' || status === 'danger';

  return (
    <Card className={cn("shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105", cardBorderColor(), 'border-2')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">{label}</CardTitle>
        <Icon className={cn("h-5 w-5", value === null ? "text-muted-foreground" : isCritical ? valueColor() : "text-primary" )} />
      </CardHeader>
      <CardContent>
        {value !== null ? (
          <>
            <div className={cn("text-3xl font-bold text-accent", valueColor())}>
              {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span className="text-xl font-normal text-muted-foreground ml-1">{unit}</span>
            </div>
            {isCritical && (
              <p className={cn("text-xs mt-1 flex items-center", valueColor())}>
                <TriangleAlert className="h-4 w-4 mr-1" />
                {status === 'warning' ? 'Caution advised' : 'Critical level'}
              </p>
            )}
            {status === 'normal' && (
                 <p className="text-xs text-green-500 mt-1">Levels are normal</p>
            )}
          </>
        ) : (
          <div className="text-3xl font-bold text-muted-foreground">-</div>
        )}
         <p className="text-xs text-muted-foreground pt-1">
          {label === 'CO₂ Levels' && "Ideal: <1000 ppm"}
          {label === 'CO Levels' && "Ideal: <9 ppm"}
          {label === 'Temperature' && "Ideal: 20-25 °C"}
          {label === 'Humidity' && "Ideal: 40-60 %"}
        </p>
      </CardContent>
    </Card>
  );
}
