
import type { MetricConfig, MetricKey, MetricStatus } from '@/types/airQuality';
import { Thermometer, Droplets, Atom, FlameKindling, Flame } from 'lucide-react'; // Added Flame

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
  combustible: { // Added configuration for Combustible Gas
    label: 'Combustible Gas',
    unit: 'ppm', // Assuming ppm, adjust if sensor provides %LEL or other units
    Icon: Flame,
    thresholds: {
      normalHigh: 300,  // Example: Below 300 ppm is considered normal
      dangerHigh: 1000, // Example: Above 1000 ppm is danger
    },
  },
  temp: {
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    thresholds: {
      // Seasonal thresholds are handled dynamically in getMetricStatus
      idealLow: 24, // Default placeholder, not directly used by seasonal logic
      idealHigh: 31, // Default placeholder
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

export const getMetricStatus = (metricKey: MetricKey, value: number): MetricStatus => {
  const config = METRIC_CONFIGS[metricKey];
  if (typeof value !== 'number' || isNaN(value)) return 'unknown';
  if (!config) return 'unknown';

  if (metricKey === 'co2' || metricKey === 'co' || metricKey === 'combustible') {
    const { normalHigh, dangerHigh } = config.thresholds;
    if (value < normalHigh!) return 'normal';
    if (value < dangerHigh!) return 'warning';
    return 'danger';
  }

  if (metricKey === 'humidity') {
    const { idealLow, idealHigh, warningLow, warningHigh, dangerLow, dangerHigh } = config.thresholds;
    if (value < dangerLow! || value > dangerHigh!) return 'danger';
    if (value < warningLow! || value > warningHigh!) return 'warning';
    if (value >= idealLow! && value <= idealHigh!) return 'normal';
    return 'warning';
  }

  if (metricKey === 'temp') {
    const month = new Date().getMonth();
    let currentThresholds: { idealLow: number, idealHigh: number, warningLow: number, warningHigh: number, dangerLow: number, dangerHigh: number };

    if (month === 11 || month === 0 || month === 1) { // Dec, Jan, Feb
      currentThresholds = { idealLow: 24, idealHigh: 31, warningLow: 21, warningHigh: 34, dangerLow: 20, dangerHigh: 35 };
    } else if (month >= 2 && month <= 4) { // Mar, Apr, May (Changed June to May for this block)
      currentThresholds = { idealLow: 28, idealHigh: 38, warningLow: 25, warningHigh: 41, dangerLow: 24, dangerHigh: 42 };
    } else { // June - November (Changed to start from June)
      currentThresholds = { idealLow: 27, idealHigh: 34, warningLow: 24, warningHigh: 37, dangerLow: 23, dangerHigh: 38 };
    }

    const { idealLow, idealHigh, warningLow, warningHigh, dangerLow, dangerHigh } = currentThresholds;

    if (value < dangerLow || value > dangerHigh) return 'danger';
    if (value < warningLow || value > warningHigh) return 'warning';
    if (value >= idealLow && value <= idealHigh) return 'normal';
    return 'warning';
  }
  
  return 'unknown';
};
