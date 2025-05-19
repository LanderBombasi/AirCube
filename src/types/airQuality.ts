export type AirQualityData = {
  co2: number;
  co: number;
  temperature: number;
  humidity: number;
};

export type MetricKey = keyof AirQualityData;

export type MetricStatus = 'normal' | 'warning' | 'danger' | 'unknown';

export interface MetricConfig {
  label: string;
  unit: string;
  Icon: React.ElementType;
  thresholds: {
    normalHigh?: number; // For CO, CO2: below this is normal
    warningLow?: number; // For Temp, Humidity: below this is warning
    warningHigh?: number; // For Temp, Humidity: above this is warning
    dangerLow?: number; // Below this is danger
    dangerHigh?: number; // Above this is danger
    idealLow?: number; // For Temp, Humidity: ideal range start
    idealHigh?: number; // For Temp, Humidity: ideal range end
  };
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
