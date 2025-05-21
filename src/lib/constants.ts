
import type { MetricConfig, MetricKey, MetricStatus } from '@/types/airQuality';
import { Thermometer, Droplets, Atom, FlameKindling } from 'lucide-react'; // Removed TriangleAlert as it's not used directly here

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
  temp: { // Changed key from 'temperature' to 'temp'
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
  if (typeof value !== 'number' || isNaN(value)) return 'unknown'; // Added check for NaN
  if (!config) return 'unknown';

  const { normalHigh, warningLow, warningHigh, dangerLow, dangerHigh, idealLow, idealHigh } = config.thresholds;

  if (metricKey === 'co2' || metricKey === 'co') {
    if (value < normalHigh!) return 'normal';
    if (value < dangerHigh!) return 'warning';
    return 'danger';
  }

  // Changed 'temperature' to 'temp'
  if (metricKey === 'temp' || metricKey === 'humidity') {
    if (value < dangerLow! || value > dangerHigh!) return 'danger';
    if (value < warningLow! || value > warningHigh!) return 'warning';
    if (value >= idealLow! && value <= idealHigh!) return 'normal';
    // If it's not danger and not normal (within ideal), it implies it's in the warning range but outside ideal.
    // This covers cases like ideal 20-25, warning 18-28. Value 19 is warning. Value 26 is warning.
    return 'warning';
  }
  
  return 'unknown';
};
