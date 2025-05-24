
import type { MetricConfig, MetricKey, MetricStatus } from '@/types/airQuality';
import { Thermometer, Droplets, Atom, FlameKindling, Flame } from 'lucide-react';
import type { CustomThresholds, CustomThresholdValues } from '@/contexts/SettingsContext';

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
    // Base thresholds, seasonal logic in getMetricStatus will refine these if no custom ones are set
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
  activeCustomThresholds?: MetricConfig['thresholds']
): MetricStatus => {
  const baseConfig = METRIC_CONFIGS[metricKey];
  if (typeof value !== 'number' || isNaN(value)) return 'unknown';
  if (!baseConfig) return 'unknown';

  // Use activeCustomThresholds if provided, otherwise fallback to defaults
  const thresholdsToUse = activeCustomThresholds && Object.keys(activeCustomThresholds).length > 0 
    ? activeCustomThresholds 
    : baseConfig.thresholds;

  if (metricKey === 'co2' || metricKey === 'co' || metricKey === 'combustible') {
    const { normalHigh, dangerHigh } = thresholdsToUse;
    if (normalHigh === undefined || dangerHigh === undefined) return 'unknown'; // Ensure thresholds are defined
    if (value < normalHigh) return 'normal';
    if (value < dangerHigh) return 'warning';
    return 'danger';
  }

  if (metricKey === 'humidity') {
    const { idealLow, idealHigh, warningLow, warningHigh, dangerLow, dangerHigh } = thresholdsToUse;
    if (idealLow === undefined || idealHigh === undefined || warningLow === undefined || warningHigh === undefined || dangerLow === undefined || dangerHigh === undefined) return 'unknown';
    
    if (value < dangerLow || value > dangerHigh) return 'danger';
    if (value < warningLow || value > warningHigh) return 'warning';
    if (value >= idealLow && value <= idealHigh) return 'normal';
    return 'warning'; // If between ideal and warning ranges but not strictly ideal (e.g. ideal 40-60, warning 30-39 or 61-70)
  }

  if (metricKey === 'temp') {
    // If custom thresholds are provided and used, they override seasonal logic
    if (activeCustomThresholds && Object.keys(activeCustomThresholds).length > 0) {
       const { idealLow, idealHigh, warningLow, warningHigh, dangerLow, dangerHigh } = thresholdsToUse;
       if (idealLow === undefined || idealHigh === undefined || warningLow === undefined || warningHigh === undefined || dangerLow === undefined || dangerHigh === undefined) return 'unknown';

       if (value < dangerLow || value > dangerHigh) return 'danger';
       if (value < warningLow || value > warningHigh) return 'warning';
       if (value >= idealLow && value <= idealHigh) return 'normal';
       return 'warning';
    } else {
      // Seasonal logic (default behavior)
      const month = new Date().getMonth();
      let currentSeasonalThresholds: MetricConfig['thresholds'];

      if (month === 11 || month === 0 || month === 1) { // Dec, Jan, Feb
        currentSeasonalThresholds = { idealLow: 24, idealHigh: 31, warningLow: 21, warningHigh: 34, dangerLow: 20, dangerHigh: 35 };
      } else if (month >= 2 && month <= 4) { // Mar, Apr, May 
        currentSeasonalThresholds = { idealLow: 28, idealHigh: 38, warningLow: 25, warningHigh: 41, dangerLow: 24, dangerHigh: 42 };
      } else { // June - November 
        currentSeasonalThresholds = { idealLow: 27, idealHigh: 34, warningLow: 24, warningHigh: 37, dangerLow: 23, dangerHigh: 38 };
      }
      const { idealLow, idealHigh, warningLow, warningHigh, dangerLow, dangerHigh } = currentSeasonalThresholds;
      if (idealLow === undefined || idealHigh === undefined || warningLow === undefined || warningHigh === undefined || dangerLow === undefined || dangerHigh === undefined) return 'unknown';

      if (value < dangerLow || value > dangerHigh) return 'danger';
      if (value < warningLow || value > warningHigh) return 'warning';
      if (value >= idealLow && value <= idealHigh) return 'normal';
      return 'warning';
    }
  }
  
  return 'unknown';
};
