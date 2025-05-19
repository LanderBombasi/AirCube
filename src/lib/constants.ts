import type { MetricConfig, MetricKey, MetricStatus } from '@/types/airQuality';
import { Thermometer, Droplets, Atom, FlameKindling, TriangleAlert } from 'lucide-react';

export const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  co2: {
    label: 'CO₂ Levels',
    unit: 'ppm',
    Icon: Atom, // Replaced Molecule with Atom
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
  temperature: {
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    thresholds: {
      idealLow: 20,
      idealHigh: 25,
      warningLow: 18,
      warningHigh: 28,
      dangerLow: 15,
      dangerHigh: 30,
    },
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    Icon: Droplets,
    thresholds: {
      idealLow: 40,
      idealHigh: 60,
      warningLow: 30,
      warningHigh: 70,
      dangerLow: 20,
      dangerHigh: 80,
    },
  },
};

export const getMetricStatus = (metricKey: MetricKey, value: number): MetricStatus => {
  const config = METRIC_CONFIGS[metricKey];
  if (!config) return 'unknown';

  const { normalHigh, warningLow, warningHigh, dangerLow, dangerHigh, idealLow, idealHigh } = config.thresholds;

  if (metricKey === 'co2' || metricKey === 'co') {
    if (value < normalHigh!) return 'normal';
    if (value < dangerHigh!) return 'warning';
    return 'danger';
  }

  if (metricKey === 'temperature' || metricKey === 'humidity') {
    if (value < dangerLow! || value > dangerHigh!) return 'danger';
    if (value < warningLow! || value > warningHigh!) return 'warning';
    // Values within ideal range but outside warning (e.g. ideal 20-25, warning 18-28. A value of 19 is warning, 22 is normal)
    // This condition check for normal: inside ideal range
    if (value >= idealLow! && value <= idealHigh!) return 'normal';
    // If its not danger, and not normal (within ideal), it must be warning if its within warning range.
    // Or handle cases where ideal range is narrower than warning ranges.
    // If value is within warningLow/High but not idealLow/High, it's a warning.
    // Example: Ideal 20-25. Warning 18-28. Value 19 -> (19 < 20 && 19 >= 18) -> warning
    // Value 26 -> (26 > 25 && 26 <= 28) -> warning
    // If it's not danger and not normal, it's warning
    return 'warning';
  }
  
  return 'unknown';
};
