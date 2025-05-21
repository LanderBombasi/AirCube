
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
      idealLow: 23,    // Philippines: Ideal 23-27°C
      idealHigh: 27,
      warningLow: 20,  // Warning if 20-22.9°C or 27.1-30°C
      warningHigh: 30,
      dangerLow: 18,   // Danger < 18°C
      dangerHigh: 32,  // Danger > 32°C
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
      dangerLow: 30,   // Danger < 30%
      dangerHigh: 80,  // Danger > 80%
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
    if (value < dangerLow! || value > dangerHigh!) return 'danger';
    if (value < warningLow! || value > warningHigh!) return 'warning'; // Catches values outside ideal but not yet danger
    if (value >= idealLow! && value <= idealHigh!) return 'normal';
    
    // If it's not danger, not explicitly warning (outside warningLow/High), and not normal (within ideal),
    // it implies it's in a range between ideal and warning boundaries, which should be warning.
    // Example: ideal 23-27, warningLow 20, warningHigh 30. Value 22 is warning. Value 28 is warning.
    return 'warning';
  }
  
  return 'unknown';
};
