
"use client";

import type { MetricKey, MetricConfig } from '@/types/airQuality';
import { METRIC_CONFIGS as DEFAULT_METRIC_CONFIGS } from '@/lib/constants';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorThemeName = 'default' | 'oceanBlue' | 'forestGreen';

interface ColorTheme {
  name: ColorThemeName;
  label: string;
  colors: {
    light: Partial<Record<string, string>>; // CSS Var -> HSL Value
    dark?: Partial<Record<string, string>>; // Optional: specific dark overrides for this theme
  };
}

export const COLOR_THEMES: Record<ColorThemeName, ColorTheme> = {
  default: {
    name: 'default',
    label: 'Default',
    colors: { light: {} }, // No overrides, uses globals.css
  },
  oceanBlue: {
    name: 'oceanBlue',
    label: 'Ocean Blue',
    colors: {
      light: {
        '--background': '200 50% 95%',
        '--foreground': '210 60% 20%',
        '--card': '200 50% 100%',
        '--card-foreground': '210 60% 20%',
        '--popover': '200 50% 100%',
        '--popover-foreground': '210 60% 20%',
        '--primary': '205 80% 50%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '200 40% 90%',
        '--secondary-foreground': '210 50% 30%',
        '--muted': '200 30% 85%',
        '--muted-foreground': '210 30% 45%',
        '--accent': '180 70% 60%',
        '--accent-foreground': '210 60% 20%',
        '--border': '200 30% 85%',
        '--input': '200 30% 85%',
        '--ring': '205 80% 50%',
      },
    },
  },
  forestGreen: {
    name: 'forestGreen',
    label: 'Forest Green',
    colors: {
      light: {
        '--background': '120 20% 96%',
        '--foreground': '120 60% 15%',
        '--card': '120 20% 100%',
        '--card-foreground': '120 60% 15%',
        '--popover': '120 20% 100%',
        '--popover-foreground': '120 60% 15%',
        '--primary': '130 50% 40%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '120 15% 92%',
        '--secondary-foreground': '120 50% 25%',
        '--muted': '120 10% 88%',
        '--muted-foreground': '120 30% 40%',
        '--accent': '90 60% 55%',
        '--accent-foreground': '120 60% 15%',
        '--border': '120 15% 88%',
        '--input': '120 15% 88%',
        '--ring': '130 50% 40%',
      },
    },
  },
};


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
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  activeColorTheme: ColorThemeName;
  setActiveColorTheme: (themeName: ColorThemeName) => void;
  customThresholds: CustomThresholds;
  getThresholdsForMetric: (metricKey: MetricKey) => MetricConfig['thresholds'];
  updateThreshold: (metricKey: MetricKey, field: keyof CustomThresholdValues, value: string | number) => void;
  resetThresholds: (metricKey?: MetricKey) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialThemeMode = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const storedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
    if (storedTheme) return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; 
};

const getInitialColorTheme = (): ColorThemeName => {
  if (typeof window !== 'undefined') {
    const storedColorTheme = localStorage.getItem('activeColorTheme') as ColorThemeName | null;
    if (storedColorTheme && COLOR_THEMES[storedColorTheme]) {
      return storedColorTheme;
    }
  }
  return 'default';
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
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [activeColorTheme, setActiveColorThemeState] = useState<ColorThemeName>('default');
  const [customThresholds, setCustomThresholds] = useState<CustomThresholds>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setThemeModeState(getInitialThemeMode());
    setActiveColorThemeState(getInitialColorTheme());
    setCustomThresholds(getInitialCustomThresholds());
  }, []);

  // Effect to apply color theme and dark/light mode
  useEffect(() => {
    if (!isMounted) return;

    const root = window.document.documentElement;
    
    // Apply color theme variables
    const selectedTheme = COLOR_THEMES[activeColorTheme];
    const colorsToApply = selectedTheme.colors.light; // For now, custom themes only affect light mode directly

    // Remove any previously applied inline theme styles
    Object.keys(COLOR_THEMES).forEach(themeKey => {
      const theme = COLOR_THEMES[themeKey as ColorThemeName];
      Object.keys(theme.colors.light).forEach(cssVar => {
        root.style.removeProperty(cssVar);
      });
    });
    
    if (activeColorTheme !== 'default') {
      Object.entries(colorsToApply).forEach(([cssVar, hslValue]) => {
        root.style.setProperty(cssVar, hslValue);
      });
    }
    localStorage.setItem('activeColorTheme', activeColorTheme);

    // Apply dark/light mode class
    root.classList.remove('light', 'dark');
    let systemThemeMode: ThemeMode = 'light';
    if (typeof window !== 'undefined') {
      systemThemeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    if (themeMode === 'system') {
      root.classList.add(systemThemeMode);
    } else {
      root.classList.add(themeMode);
    }
    localStorage.setItem('themeMode', themeMode);

  }, [themeMode, activeColorTheme, isMounted]);

  const setThemeMode = (newThemeMode: ThemeMode) => {
    if (!isMounted) return;
    setThemeModeState(newThemeMode);
  };

  const setActiveColorTheme = (newColorTheme: ColorThemeName) => {
    if (!isMounted) return;
    setActiveColorThemeState(newColorTheme);
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
    const month = new Date().getMonth(); 
    if (month === 11 || month === 0 || month === 1) { 
      return { idealLow: 24, idealHigh: 31, warningLow: 21, warningHigh: 34, dangerLow: 20, dangerHigh: 35 };
    } else if (month >= 2 && month <= 4) { 
      return { idealLow: 28, idealHigh: 38, warningLow: 25, warningHigh: 41, dangerLow: 24, dangerHigh: 42 };
    } else { 
      return { idealLow: 27, idealHigh: 34, warningLow: 24, warningHigh: 37, dangerLow: 23, dangerHigh: 38 };
    }
  }, []);

  const getThresholdsForMetric = useCallback((metricKey: MetricKey): MetricConfig['thresholds'] => {
    if (!isMounted) return DEFAULT_METRIC_CONFIGS[metricKey]?.thresholds || {};
    
    const baseDefaults = DEFAULT_METRIC_CONFIGS[metricKey]?.thresholds || {};
    const userCustomSettings = customThresholds[metricKey];

    if (metricKey === MetricKey.temp) {
      const hasCustomTempSettings = userCustomSettings && Object.keys(userCustomSettings).some(key => userCustomSettings[key as keyof CustomThresholdValues] !== undefined);
      if (hasCustomTempSettings) {
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
        return getSeasonalTempThresholds();
      }
    } else {
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
    <SettingsContext.Provider value={{ themeMode, setThemeMode, activeColorTheme, setActiveColorTheme, customThresholds, getThresholdsForMetric, updateThreshold, resetThresholds }}>
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

    