
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
  const [theme, setThemeState] = useState<Theme>('light'); // Initialized in useEffect
  const [customThresholds, setCustomThresholds] = useState<CustomThresholds>({}); // Initialized in useEffect
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
      // Remove field if value is undefined (empty string)
      if (numericValue === undefined) {
        delete updatedMetricThresholds[field];
      }
      
      const newThresholds = {
        ...prev,
        [metricKey]: updatedMetricThresholds,
      };
      localStorage.setItem('customThresholds', JSON.stringify(newThresholds));
      return newThresholds;
    });
  }, [isMounted]);

  const resetThresholds = useCallback((metricKey?: MetricKey) => {
    if (!isMounted) return;
    setCustomThresholds(prev => {
      let newThresholds;
      if (metricKey) {
        const {[metricKey]: _, ...rest} = prev; // Remove the specific metric's custom thresholds
        newThresholds = rest;
      } else {
        newThresholds = {}; // Reset all custom thresholds
      }
      localStorage.setItem('customThresholds', JSON.stringify(newThresholds));
      return newThresholds;
    });
  }, [isMounted]);

  const getThresholdsForMetric = useCallback((metricKey: MetricKey): MetricConfig['thresholds'] => {
    if (!isMounted) return DEFAULT_METRIC_CONFIGS[metricKey]?.thresholds || {};
    
    const custom = customThresholds[metricKey];
    const defaults = DEFAULT_METRIC_CONFIGS[metricKey]?.thresholds || {};
    
    // If custom settings exist for this metric, merge them with defaults.
    // Custom values will override defaults.
    if (custom && Object.keys(custom).length > 0) {
      const merged = { ...defaults };
      for (const key in custom) {
        if (Object.prototype.hasOwnProperty.call(custom, key)) {
          const typedKey = key as keyof CustomThresholdValues;
          if (custom[typedKey] !== undefined && !isNaN(Number(custom[typedKey]))) {
            (merged as any)[typedKey] = custom[typedKey];
          }
        }
      }
      return merged;
    }
    return defaults;
  }, [customThresholds, isMounted]);


  if (!isMounted) {
    return null; // Or a loading spinner, but null is fine for now to prevent hydration mismatch
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
