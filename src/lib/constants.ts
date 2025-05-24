
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
  combustible: { 
    label: 'Combustible Gas',
    unit: 'ppm', 
    Icon: Flame,
    thresholds: {
      normalHigh: 500,  // Adjusted: Below 500 ppm is considered normal
      dangerHigh: 1500, // Adjusted: Above 1500 ppm is danger, 500-1500 is warning
    },
  },
  temp: {
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    thresholds: {
      // Seasonal thresholds are handled dynamically in getMetricStatus
      idealLow: 24, 
      idealHigh: 31, 
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
    } else if (month >= 2 && month <= 4) { // Mar, Apr, May 
      currentThresholds = { idealLow: 28, idealHigh: 38, warningLow: 25, warningHigh: 41, dangerLow: 24, dangerHigh: 42 };
    } else { // June - November 
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

