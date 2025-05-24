

export type AirQualityData = {
  co2: number;
  co: number;
  combustible: number;
  temp: number;
  humidity: number;
};

// Use an enum for MetricKey to ensure it's compatible with Zod's z.nativeEnum
export enum MetricKey {
  co2 = 'co2',
  co = 'co',
  combustible = 'combustible',
  temp = 'temp',
  humidity = 'humidity',
}

export type MetricStatus = 'normal' | 'warning' | 'danger' | 'unknown';

export interface MetricConfig {
  label: string;
  unit: string;
  Icon: React.ElementType;
  thresholds: {
    normalHigh?: number; 
    warningLow?: number; 
    warningHigh?: number; 
    dangerLow?: number; 
    dangerHigh?: number; 
    idealLow?: number; 
    idealHigh?: number; 
  };
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HistoricalDataPoint extends AirQualityData {
  timestamp: number;
}
