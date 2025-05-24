
import type { MetricConfig, MetricKey, MetricStatus } from '@/types/airQuality';
import { Thermometer, Droplets, Atom, FlameKindling, Flame } from 'lucide-react';

export const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  co2: {
    label: 'CO₂ Levels',
    unit: 'ppm',
    Icon: Atom,
    thresholds: {
      normalHigh: 1000,
      dangerHigh: 2000,
    },
  },
  co: {
    label: 'CO Levels',
    unit: 'ppm',
    Icon: FlameKindling,
    thresholds: {
      normalHigh: 9,
      dangerHigh: 50,
    },
  },
  combustible: { 
    label: 'Combustible Gas',
    unit: 'ppm', 
    Icon: Flame,
    thresholds: {
      normalHigh: 500, 
      dangerHigh: 1500,
    },
  },
  temp: {
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    // Base thresholds, actual operational thresholds will be seasonal or custom.
    // These serve as a fallback or merge base. Using Dec-Feb as base.
    thresholds: {
      idealLow: 24, 
      idealHigh: 31,
      warningLow: 21,
      warningHigh: 34,
      dangerLow: 20,
      dangerHigh: 35,
    },
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    Icon: Droplets,
    thresholds: {
      idealLow: 45,
      idealHigh: 65,
      warningLow: 35,
      warningHigh: 75,
      dangerLow: 30,
      dangerHigh: 80,
    },
  },
};

export const getMetricStatus = (
  metricKey: MetricKey,
  value: number,
  currentThresholds: MetricConfig['thresholds'] // Renamed from activeCustomThresholds
): MetricStatus => {
  if (typeof value !== 'number' || isNaN(value)) return 'unknown';
  
  // currentThresholds are now the definitive thresholds to use,
  // whether they are default, seasonal, or custom-merged.
  const thresholdsToUse = currentThresholds;

  if (!thresholdsToUse) return 'unknown'; // Should not happen if getThresholdsForMetric works

  if (metricKey === 'co2' || metricKey === 'co' || metricKey === 'combustible') {
    const { normalHigh, dangerHigh } = thresholdsToUse;
    if (normalHigh === undefined || dangerHigh === undefined) return 'unknown';
    if (value < normalHigh) return 'normal';
    if (value < dangerHigh) return 'warning';
    return 'danger';
  }

  if (metricKey === 'humidity' || metricKey === 'temp') { // temp now uses this path directly
    const { idealLow, idealHigh, warningLow, warningHigh, dangerLow, dangerHigh } = thresholdsToUse;
    if (idealLow === undefined || idealHigh === undefined || warningLow === undefined || warningHigh === undefined || dangerLow === undefined || dangerHigh === undefined) return 'unknown';
    
    if (value < dangerLow || value > dangerHigh) return 'danger';
    if (value < warningLow || value > warningHigh) return 'warning';
    if (value >= idealLow && value <= idealHigh) return 'normal';
    return 'warning'; 
  }
  
  return 'unknown';
};
