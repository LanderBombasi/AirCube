
import type { MetricConfig, MetricKey, MetricStatus } from '@/types/airQuality';
import { Thermometer, Droplets, Atom, FlameKindling } from 'lucide-react';

export const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  co2: {
    label: 'CO₂ Levels',
    unit: 'ppm',
    Icon: Atom,
    thresholds: {
      normalHigh: 1000, // Below 1000 is normal
      dangerHigh: 2000, // Above 2000 is danger, between normalHigh and dangerHigh is warning
    },
  },
  co: {
    label: 'CO Levels',
    unit: 'ppm',
    Icon: FlameKindling,
    thresholds: {
      normalHigh: 9, // Below 9 is normal
      dangerHigh: 50, // Above 50 is danger, between normalHigh and dangerHigh is warning
    },
  },
  temp: {
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    thresholds: {
      idealLow: 24,    // Philippines (Dec-Feb): Ideal 24-31°C
      idealHigh: 31,
      warningLow: 21,  // Warning if 21-23.9°C or 31.1-34°C
      warningHigh: 34,
      dangerLow: 20,   // Danger < 21°C (effectively, values below warningLow)
      dangerHigh: 35,  // Danger > 34°C (effectively, values above warningHigh)
    },
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    Icon: Droplets,
    thresholds: {
      idealLow: 45,    // Philippines: Ideal 45-65%
      idealHigh: 65,
      warningLow: 35,  // Warning if 35-44.9% or 65.1-75%
      warningHigh: 75,
      dangerLow: 30,   // Danger < 35%
      dangerHigh: 80,  // Danger > 75%
    },
  },
};

export const getMetricStatus = (metricKey: MetricKey, value: number): MetricStatus => {
  const config = METRIC_CONFIGS[metricKey];
  if (typeof value !== 'number' || isNaN(value)) return 'unknown';
  if (!config) return 'unknown';

  const { normalHigh, warningLow, warningHigh, dangerLow, dangerHigh, idealLow, idealHigh } = config.thresholds;

  if (metricKey === 'co2' || metricKey === 'co') {
    if (value < normalHigh!) return 'normal';
    if (value < dangerHigh!) return 'warning';
    return 'danger';
  }

  if (metricKey === 'temp' || metricKey === 'humidity') {
    // Order of checks is important for temp/humidity with distinct danger/warning/ideal ranges
    if (value < dangerLow! || value > dangerHigh!) return 'danger'; // Catches extremes first
    if (value < warningLow! || value > warningHigh!) return 'warning'; // Catches values outside ideal but not yet danger
    if (value >= idealLow! && value <= idealHigh!) return 'normal'; // Values within ideal range
    
    // This specific check for 'temp' ensures values between danger and warning are still warning
    // For example, if dangerLow is 20, warningLow is 21, idealLow is 24:
    // 19 is danger. 20.5 is danger. 21 is warning. 23.9 is warning. 24 is normal.
    // This logic holds true if dangerLow/High are set slightly outside warningLow/High
    // E.g., temp: ideal 24-31, warning 21-23.9 or 31.1-34, danger <21 or >34.
    // A value of 20.5 would be < dangerLow (if dangerLow = 21 for example, or using effective < warningLow for danger)
    // Let's refine the condition for danger/warning based on explicit thresholds
    if (value < idealLow! || value > idealHigh!) return 'warning'; // If not danger, and not normal, it must be warning.

    // Should not be reached if thresholds are set correctly, but as a fallback
    return 'unknown'; 
  }
  
  return 'unknown';
};
