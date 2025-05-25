
"use client";

import type { MetricConfig, MetricStatus, MetricKey } from '@/types/airQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TriangleAlert, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';

interface DataCardProps {
  metricConfig: MetricConfig;
  metricKey: MetricKey;
  value: number | null;
  status: MetricStatus;
  onShowInfo: (metricKey: MetricKey) => void;
}

export function DataCard({ metricConfig, metricKey, value, status, onShowInfo }: DataCardProps) {
  const { label, unit, Icon } = metricConfig;
  const { getThresholdsForMetric, customThresholds } = useSettings();
  const [dynamicHint, setDynamicHint] = useState('');

  useEffect(() => {
    const activeThresholds = getThresholdsForMetric(metricKey);
    
    const hasCustomIdealTempThresholds = metricKey === 'temp' && 
                                         customThresholds.temp && 
                                         (customThresholds.temp.idealLow !== undefined || 
                                          customThresholds.temp.idealHigh !== undefined);

    if (metricKey === 'temp' && !hasCustomIdealTempThresholds) {
      const month = new Date().getMonth();
      if (month === 11 || month === 0 || month === 1) { // Dec, Jan, Feb
        setDynamicHint(`Ideal (Dec-Feb): ${activeThresholds.idealLow}-${activeThresholds.idealHigh} ${unit}`);
      } else if (month >= 2 && month <= 4) { // Mar, Apr, May
        setDynamicHint(`Ideal (Mar-May): ${activeThresholds.idealLow}-${activeThresholds.idealHigh} ${unit}`);
      } else { // Jun, Jul, Aug, Sep, Oct, Nov
        setDynamicHint(`Ideal (Jun-Nov): ${activeThresholds.idealLow}-${activeThresholds.idealHigh} ${unit}`);
      }
    } else if (activeThresholds.idealLow !== undefined && activeThresholds.idealHigh !== undefined) {
      setDynamicHint(`Ideal: ${activeThresholds.idealLow}-${activeThresholds.idealHigh} ${unit}`);
    } else if (activeThresholds.normalHigh !== undefined) {
      setDynamicHint(`Ideal: <${activeThresholds.normalHigh} ${unit}`);
    } else {
      setDynamicHint("Ideal levels vary."); 
    }
  }, [metricKey, getThresholdsForMetric, unit, customThresholds, label]);

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
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", value === null ? "text-muted-foreground" : isCritical ? valueColor() : "text-primary" )} />
          <CardTitle className="text-sm font-medium text-card-foreground">{label}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onShowInfo(metricKey)}>
          <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
          <span className="sr-only">More info about {label}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {value !== null && typeof value === 'number' ? (
          <>
            <div className={cn("text-3xl font-bold", valueColor())}>
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
