
"use client";

import type { MetricConfig, MetricStatus } from '@/types/airQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DataCardProps {
  metricConfig: MetricConfig;
  value: number | null;
  status: MetricStatus;
}

export function DataCard({ metricConfig, value, status }: DataCardProps) {
  const { label, unit, Icon } = metricConfig;
  const [dynamicHint, setDynamicHint] = useState('');

  useEffect(() => {
    if (label === 'Temperature') {
      const month = new Date().getMonth(); // 0 = Jan, 1 = Feb, ..., 11 = Dec
      if (month === 11 || month === 0 || month === 1) { // Dec, Jan, Feb
        setDynamicHint("Ideal (Dec-Feb): 24-31 °C");
      } else if (month >= 2 && month <= 4) { // Mar, Apr, May
        setDynamicHint("Ideal (Mar-May): 28-38 °C");
      } else { // Jun, Jul, Aug, Sep, Oct, Nov
        setDynamicHint("Ideal (Jun-Nov): 27-34 °C");
      }
    } else if (label === 'CO₂ Levels') {
      setDynamicHint("Ideal: <1000 ppm");
    } else if (label === 'CO Levels') {
      setDynamicHint("Ideal: <9 ppm");
    } else if (label === 'Humidity') {
      setDynamicHint("Ideal: 45-65 %");
    } else if (label === 'Combustible Gas') {
      setDynamicHint("Ideal: <500 ppm"); // Adjusted hint for combustible gas
    }
  }, [label]);

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
        {value !== null && typeof value === 'number' ? (
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
          {dynamicHint}
        </p>
      </CardContent>
    </Card>
  );
}

