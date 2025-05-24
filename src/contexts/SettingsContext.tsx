
"use client";

import type { MetricKey, MetricConfig } from '@/types/airQuality';
import { METRIC_CONFIGS as DEFAULT_METRIC_CONFIGS } from '@/lib/constants';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface CustomThresholdValues {
  normalHigh?: number;
  warningLow?: number;
  warningHigh?: number;
  dangerLow?: number;
  dangerHigh?: number;
  idealLow?: number;
  idealHigh?: number;
}

export type CustomThresholds = Partial<Record<MetricKey, CustomThresholdValues>>;

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customThresholds: CustomThresholds;
  getThresholdsForMetric: (metricKey: MetricKey) => MetricConfig['thresholds'];
  updateThreshold: (metricKey: MetricKey, field: keyof CustomThresholdValues, value: string | number) => void;
  resetThresholds: (metricKey?: MetricKey) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; // Default for server-side or if window is not available
};

const getInitialCustomThresholds = (): CustomThresholds => {
  if (typeof window !== 'undefined') {
    const storedThresholds = localStorage.getItem('customThresholds');
    if (storedThresholds) {
      try {
        return JSON.parse(storedThresholds);
      } catch (e) {
        console.error("Failed to parse customThresholds from localStorage", e);
        return {};
      }
    }
  }
  return {};
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [customThresholds, setCustomThresholds] = useState<CustomThresholds>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setThemeState(getInitialTheme());
    setCustomThresholds(getInitialCustomThresholds());
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let systemTheme: Theme = 'light';
    if (typeof window !== 'undefined') {
      systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    if (theme === 'system') {
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme, isMounted]);

  const setTheme = (newTheme: Theme) => {
    if (!isMounted) return;
    setThemeState(newTheme);
  };

  const updateThreshold = useCallback((metricKey: MetricKey, field: keyof CustomThresholdValues, value: string | number) => {
    if (!isMounted) return;
    setCustomThresholds(prev => {
      const numericValue = value === '' ? undefined : Number(value);
      const updatedMetricThresholds = {
        ...(prev[metricKey] || {}),
        [field]: numericValue,
      };
      if (numericValue === undefined) {
        delete updatedMetricThresholds[field];
      }
      
      const newThresholds = {
        ...prev,
        [metricKey]: Object.keys(updatedMetricThresholds).length > 0 ? updatedMetricThresholds : undefined,
      };
      if (!newThresholds[metricKey]) {
        delete newThresholds[metricKey];
      }
      localStorage.setItem('customThresholds', JSON.stringify(newThresholds));
      return newThresholds;
    });
  }, [isMounted]);

  const resetThresholds = useCallback((metricKey?: MetricKey) => {
    if (!isMounted) return;
    setCustomThresholds(prev => {
      let newThresholds;
      if (metricKey) {
        const {[metricKey]: _, ...rest} = prev; 
        newThresholds = rest;
      } else {
        newThresholds = {}; 
      }
      localStorage.setItem('customThresholds', JSON.stringify(newThresholds));
      return newThresholds;
    });
  }, [isMounted]);

  const getSeasonalTempThresholds = useCallback((): MetricConfig['thresholds'] => {
    const month = new Date().getMonth(); // 0 (Jan) to 11 (Dec)
    if (month === 11 || month === 0 || month === 1) { // Dec, Jan, Feb
      return { idealLow: 24, idealHigh: 31, warningLow: 21, warningHigh: 34, dangerLow: 20, dangerHigh: 35 };
    } else if (month >= 2 && month <= 4) { // Mar, Apr, May
      return { idealLow: 28, idealHigh: 38, warningLow: 25, warningHigh: 41, dangerLow: 24, dangerHigh: 42 };
    } else { // June - November
      return { idealLow: 27, idealHigh: 34, warningLow: 24, warningHigh: 37, dangerLow: 23, dangerHigh: 38 };
    }
  }, []);

  const getThresholdsForMetric = useCallback((metricKey: MetricKey): MetricConfig['thresholds'] => {
    if (!isMounted) return DEFAULT_METRIC_CONFIGS[metricKey]?.thresholds || {};
    
    const baseDefaults = DEFAULT_METRIC_CONFIGS[metricKey]?.thresholds || {};
    const userCustomSettings = customThresholds[metricKey];

    if (metricKey === 'temp') {
      const hasCustomTempSettings = userCustomSettings && Object.keys(userCustomSettings).some(key => userCustomSettings[key as keyof CustomThresholdValues] !== undefined);
      if (hasCustomTempSettings) {
        // Merge user's custom temp settings with base defaults for temp
        const merged = { ...baseDefaults };
         for (const key in userCustomSettings) {
          if (Object.prototype.hasOwnProperty.call(userCustomSettings, key)) {
            const typedKey = key as keyof CustomThresholdValues;
            if (userCustomSettings[typedKey] !== undefined && !isNaN(Number(userCustomSettings[typedKey]))) {
              (merged as any)[typedKey] = userCustomSettings[typedKey];
            }
          }
        }
        return merged;
      } else {
        // No custom temp settings by user, return seasonal defaults
        return getSeasonalTempThresholds();
      }
    } else {
      // For metrics other than temperature
      if (userCustomSettings && Object.keys(userCustomSettings).length > 0) {
        const merged = { ...baseDefaults };
        for (const key in userCustomSettings) {
          if (Object.prototype.hasOwnProperty.call(userCustomSettings, key)) {
            const typedKey = key as keyof CustomThresholdValues;
            if (userCustomSettings[typedKey] !== undefined && !isNaN(Number(userCustomSettings[typedKey]))) {
              (merged as any)[typedKey] = userCustomSettings[typedKey];
            }
          }
        }
        return merged;
      }
      return baseDefaults;
    }
  }, [customThresholds, isMounted, getSeasonalTempThresholds]);


  if (!isMounted) {
    return null; 
  }

  return (
    <SettingsContext.Provider value={{ theme, setTheme, customThresholds, getThresholdsForMetric, updateThreshold, resetThresholds }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
