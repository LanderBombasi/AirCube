
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAirQualityData } from '@/hooks/useAirQualityData';
import { DataCard } from './DataCard';
import { METRIC_CONFIGS as DEFAULT_METRIC_CONFIGS, getMetricStatus } from '@/lib/constants';
import { MetricKey, type MetricConfig, type HistoricalDataPoint, type MetricStatus } from '@/types/airQuality';
import { Header } from '@/components/layout/Header';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiOff, Brain, Info } from 'lucide-react';
import { MetricHistoryChart } from './MetricHistoryChart';
import { FrequencySpectrumChart } from './FrequencySpectrumChart';
import { calculateDFT } from '@/lib/fourierUtils';
import type { DFTResult } from '@/lib/fourierUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/contexts/SettingsContext';
import { getAirQualitySummary, type AirQualitySummaryInput, type AirQualitySummaryOutput } from '@/ai/flows/summarizeAirQualityFlow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '../ui/scroll-area';


interface MetricInfoRecommendations {
  normal: string;
  warning: string;
  danger: string;
  unknown?: string;
}
interface MetricInfoContent {
  title: string;
  sources: string;
  implications: string;
  recommendations: MetricInfoRecommendations;
}

const METRIC_INFO_CONTENT: Record<MetricKey, MetricInfoContent> = {
  [MetricKey.co2]: {
    title: "About CO₂ (Carbon Dioxide)",
    sources: "Exhaled air from people and animals, combustion of fossil fuels (heating, cooking with gas), decomposition of organic matter.",
    implications: "High levels (typically >1000-1500 ppm indoors) can indicate poor ventilation. Can cause drowsiness, headaches, difficulty concentrating. Very high levels (>5000 ppm) can be dangerous.",
    recommendations: {
      normal: "Maintain good ventilation by opening windows regularly or using mechanical ventilation. Current levels are good.",
      warning: "CO₂ levels are elevated, suggesting ventilation may be inadequate. Increase fresh air by opening windows or enhancing ventilation. Consider reducing occupancy in the affected area temporarily.",
      danger: "CO₂ levels are dangerously high. This indicates very poor ventilation or a significant CO₂ source. Ventilate the area immediately with fresh outdoor air. If symptoms like severe headache or dizziness occur, evacuate and seek fresh air. Investigate the cause.",
      unknown: "Ensure good ventilation by opening windows regularly. Use air purifiers with CO₂ monitoring if concerned. Reduce indoor sources if possible."
    },
  },
  [MetricKey.co]: {
    title: "About CO (Carbon Monoxide)",
    sources: "Incomplete combustion of fuels (e.g., gas stoves, water heaters, fireplaces, car exhaust, wood burners).",
    implications: "A highly toxic gas, even at low levels. Odorless and colorless. Can cause headaches, dizziness, nausea, confusion, and can be fatal.",
    recommendations: {
      normal: "Current CO levels are safe. Continue to ensure fuel-burning appliances are well-maintained and properly ventilated. Ensure CO detectors are functional.",
      warning: "CO levels are elevated. This is a serious concern. Ventilate the area immediately by opening windows and doors. Turn off any suspected fuel-burning appliances. Evacuate if anyone feels unwell. Call a qualified technician to inspect appliances.",
      danger: "CO levels are dangerously high! This is an emergency. Evacuate the premises immediately. Do not re-enter until cleared by emergency services. Call emergency services (e.g., fire department) from a safe location. Seek medical attention if anyone has symptoms of CO poisoning.",
      unknown: "Install CO detectors, especially near sleeping areas. Ensure proper ventilation for all fuel-burning appliances and have them regularly inspected. Never run cars or generators in attached garages or enclosed spaces."
    },
  },
  [MetricKey.combustible]: {
    title: "About Combustible Gases",
    sources: "Leaks from natural gas or propane (LPG) lines, stoves, water heaters, or stored fuel containers. Some sensors may also detect other volatile organic compounds (VOCs).",
    implications: "Primary risk is fire or explosion. Some gases can also displace oxygen and pose an asphyxiation hazard. Early detection is crucial.",
    recommendations: {
      normal: "Current combustible gas levels are normal. Regularly check gas appliances and lines for leaks according to manufacturer recommendations.",
      warning: "Combustible gas levels are elevated. This could indicate a small leak or accumulation. Avoid using open flames or creating sparks. Ventilate the area. If you smell gas, evacuate immediately and call your gas company or emergency services from a safe location.",
      danger: "Combustible gas levels are dangerously high! Risk of fire or explosion. Evacuate the area immediately. Do not operate electrical switches, use phones, or create any sparks. Call your gas company or emergency services from a safe distance.",
      unknown: "If you suspect a leak (e.g., smell gas or alarm sounds), evacuate the area immediately. Do not operate electrical switches or create sparks. Call your gas company or emergency services from a safe location."
    },
  },
  [MetricKey.temp]: {
    title: "About Temperature",
    sources: "Ambient outdoor conditions, heating/cooling systems (HVAC), sunlight exposure, heat generated by electronic devices and occupants.",
    implications: "Directly affects comfort levels. Extreme temperatures can impact health (heatstroke, hypothermia), sleep quality, and productivity. Can also affect the performance of some electronic devices.",
    recommendations: {
      normal: "Current temperature is within a comfortable range. Continue to manage with HVAC or natural ventilation as needed for comfort.",
      warning: "Temperature is outside the ideal comfort range. Adjust thermostat, use fans, or manage sun exposure to return to a more comfortable level. Dress appropriately for the conditions.",
      danger: "Temperature is at a level that could pose health risks (e.g., risk of heat stress or hypothermia depending on direction). Take immediate action to moderate the temperature (e.g., use AC/heating, seek a cooler/warmer environment). Be mindful of vulnerable individuals.",
      unknown: "Maintain comfortable indoor temperatures using HVAC, fans, or appropriate clothing. Refer to seasonal ideal ranges for your location. Ensure good insulation and manage sun exposure."
    },
  },
  [MetricKey.humidity]: {
    title: "About Humidity",
    sources: "Ambient moisture in the air, activities like cooking, showering, breathing. Weather patterns significantly influence outdoor humidity.",
    implications: "Affects comfort and perceived temperature. High humidity (>65-70%) can promote mold growth, dust mites, and may make it feel warmer. Low humidity (<30-40%) can cause dry skin, irritated sinuses, and static electricity.",
    recommendations: {
      normal: "Current humidity levels are good. Maintain good ventilation to manage moisture from daily activities.",
      warning: "Humidity is outside the ideal range. If too high, use a dehumidifier or increase ventilation. If too low, consider a humidifier, especially during dry seasons. Address sources of excess moisture or dryness.",
      danger: "Humidity levels are extreme and could lead to significant mold growth (if high) or severe discomfort and health issues (if very low). Take corrective actions like using dehumidifiers/humidifiers, improving ventilation, and identifying root causes.",
      unknown: "Aim for ideal humidity ranges (typically 40-60% indoors). Use dehumidifiers in overly humid conditions, and humidifiers if the air is too dry. Ensure good ventilation to manage moisture."
    },
  },
};


export function DashboardClient() {
  const { data, historicalData, connectionStatus, lastUpdateTime, connectDevice, disconnectDevice } = useAirQualityData();
  const [selectedMetricForChart, setSelectedMetricForChart] = useState<MetricKey>(MetricKey.co2);
  const [dftResults, setDftResults] = useState<DFTResult[] | null>(null);
  const [isCalculatingDFT, setIsCalculatingDFT] = useState<boolean>(false);
  const { getThresholdsForMetric } = useSettings(); 

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState<boolean>(false);

  const [infoMetricKey, setInfoMetricKey] = useState<MetricKey | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState<boolean>(false);

  const metricKeys = Object.values(MetricKey);

  const handleShowInfo = (metricKey: MetricKey) => {
    setInfoMetricKey(metricKey);
    setShowInfoDialog(true);
  };

  const getCurrentMetricStatusForInfo = (metricKey: MetricKey | null): MetricStatus => {
    if (!metricKey || !data) return 'unknown';
    const currentValue = data[metricKey];
    const thresholds = getThresholdsForMetric(metricKey);
    if (typeof currentValue !== 'number') return 'unknown';
    return getMetricStatus(metricKey, currentValue, thresholds);
  };


  useEffect(() => {
    const performDFTCalculation = async () => {
      if (historicalData && historicalData.length > 1) {
        setIsCalculatingDFT(true);
        const metricValues = historicalData.map(point => point[selectedMetricForChart]).filter(val => typeof val === 'number') as number[];
        
        if (metricValues.length > 1) {
          try {
            // Ensure calculateDFT is awaited if it's async
            const results = await calculateDFT(metricValues);
            setDftResults(results);
          } catch (error) {
            console.error("Error calculating DFT:", error);
            setDftResults(null);
          }
        } else {
          setDftResults(null);
        }
        setIsCalculatingDFT(false);
      } else {
        setDftResults(null);
      }
    };

    performDFTCalculation();
  }, [historicalData, selectedMetricForChart]);

  const selectedMetricConfig = useMemo(() => {
    return DEFAULT_METRIC_CONFIGS[selectedMetricForChart];
  }, [selectedMetricForChart]);

  const formatThresholdForAI = (metricKey: MetricKey, thresholds: MetricConfig['thresholds']): string => {
    const config = DEFAULT_METRIC_CONFIGS[metricKey];
    let parts: string[] = [`${config.label} (${config.unit})`];

    if (metricKey === MetricKey.co2 || metricKey === MetricKey.co || metricKey === MetricKey.combustible) {
        parts.push(`Normal: <${thresholds.normalHigh}, Danger: >${thresholds.dangerHigh}`);
    } else if (metricKey === MetricKey.temp || metricKey === MetricKey.humidity) {
        parts.push(`Ideal: ${thresholds.idealLow}-${thresholds.idealHigh}`);
        parts.push(`Warning: <${thresholds.warningLow} or >${thresholds.warningHigh}`);
        parts.push(`Danger: <${thresholds.dangerLow} or >${thresholds.dangerHigh}`);
    }
    return parts.join('; ') + '.';
  };


  const handleGenerateSummary = async () => {
    if (!historicalData || historicalData.length === 0) {
      setSummaryError("Not enough historical data to generate a summary.");
      setAiSummary(null);
      setShowSummaryDialog(true);
      return;
    }
    setIsGeneratingSummary(true);
    setSummaryError(null);
    setAiSummary(null);

    try {
      const metricsConfiguration: Partial<Record<MetricKey, string>> = {};
      for (const key of metricKeys) {
        const typedKey = key as MetricKey; 
        const thresholds = getThresholdsForMetric(typedKey);
        metricsConfiguration[typedKey] = formatThresholdForAI(typedKey, thresholds);
      }
      
      const input: AirQualitySummaryInput = {
        historicalReadings: historicalData.map(p => ({ 
          timestamp: p.timestamp,
          co2: p.co2 ?? null,
          co: p.co ?? null,
          combustible: p.combustible ?? null,
          temp: p.temp ?? null,
          humidity: p.humidity ?? null,
        })),
        timePeriodDescription: `the last ${historicalData.length} readings (approx. ${historicalData.length} minutes if 1 reading/min)`,
        metricsConfiguration: metricsConfiguration as Record<MetricKey, string>, 
      };
      const result: AirQualitySummaryOutput = await getAirQualitySummary(input);
      setAiSummary(result.summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setSummaryError(error instanceof Error ? error.message : "An unknown error occurred while generating the summary.");
    } finally {
      setIsGeneratingSummary(false);
      setShowSummaryDialog(true);
    }
  };


  if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header 
          connectionStatus={connectionStatus}
          lastUpdateTime={lastUpdateTime}
          onConnect={connectDevice}
          onDisconnect={disconnectDevice}
        />
        <main className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-background">
          <WifiOff className="h-24 w-24 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-semibold mb-2 text-foreground">
            {connectionStatus === 'error' ? 'Connection Error' : 'Device Disconnected'}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {connectionStatus === 'error' 
              ? 'There was an issue connecting to the AirCube device. Please check the device and try again.'
              : 'Please connect to your AirCube device to view real-time air quality data.'}
          </p>
          <Button onClick={connectDevice} size="lg">
            Connect to AirCube
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        connectionStatus={connectionStatus}
        lastUpdateTime={lastUpdateTime}
        onConnect={connectDevice}
        onDisconnect={disconnectDevice}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {connectionStatus === 'connecting' && !data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {metricKeys.map((metricKey) => (
              <CardSkeleton key={metricKey} metricId={metricKey} />
            ))}
          </div>
        )}
        {(connectionStatus === 'connected' || (connectionStatus === 'connecting' && data)) && (
          <>
            {data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {metricKeys.map((key) => {
                  const activeThresholds = getThresholdsForMetric(key as MetricKey);
                  return (
                    <DataCard
                      key={key}
                      metricKey={key as MetricKey} 
                      metricConfig={DEFAULT_METRIC_CONFIGS[key as MetricKey]} 
                      value={data[key as MetricKey]}
                      status={getMetricStatus(key as MetricKey, data[key as MetricKey], activeThresholds)}
                      onShowInfo={handleShowInfo}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground text-lg">Waiting for initial data from AirCube...</p>
                <p className="text-sm text-muted-foreground">Make sure your ESP32 device is powered on and sending data to Firebase.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mt-4">
                    {metricKeys.map((metricKey) => (
                      <CardSkeleton key={metricKey} metricId={metricKey} />
                    ))}
                  </div>
              </div>
            )}

            <div className="mt-8 mb-6">
              <Button 
                onClick={handleGenerateSummary} 
                disabled={isGeneratingSummary || !historicalData || historicalData.length === 0}
                variant="outline"
                size="lg"
              >
                <Brain className="mr-2 h-5 w-5" />
                {isGeneratingSummary ? "Generating Summary..." : "Get AI Air Quality Summary"}
              </Button>
            </div>

            <div className="mt-8">
              <div className="mb-4">
                <Label htmlFor="metric-select" className="text-lg font-semibold">View History & Spectrum For:</Label>
                <Select
                  value={selectedMetricForChart}
                  onValueChange={(value) => setSelectedMetricForChart(value as MetricKey)}
                >
                  <SelectTrigger id="metric-select" className="w-full md:w-[280px] mt-2">
                    <SelectValue placeholder="Select a metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {DEFAULT_METRIC_CONFIGS[key as MetricKey].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MetricHistoryChart 
                historicalData={historicalData}
                selectedMetric={selectedMetricForChart}
              />
              {dftResults && selectedMetricConfig && (
                <FrequencySpectrumChart
                  dftData={dftResults}
                  metricConfig={selectedMetricConfig}
                  isLoading={isCalculatingDFT}
                />
              )}
              {!dftResults && !isCalculatingDFT && historicalData && historicalData.length > 1 && selectedMetricConfig && (
                 <Card className="mt-6 shadow-lg">
                    <CardHeader>
                      <CardTitle>Frequency Spectrum: {selectedMetricConfig.label}</CardTitle>
                      <CardDescription>
                        Not enough data or error in calculation for frequency spectrum.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>Unable to display spectrum.</p>
                    </CardContent>
                  </Card>
              )}
            </div>
          </>
        )}
      </main>

      <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>AI Air Quality Summary</AlertDialogTitle>
            <AlertDialogDescription>
              {isGeneratingSummary && "Generating your air quality summary, please wait..."}
              {summaryError && `Error: ${summaryError}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {aiSummary && !isGeneratingSummary && (
            <ScrollArea className="max-h-[400px] pr-4">
                 <p className="text-sm whitespace-pre-wrap">{aiSummary}</p>
            </ScrollArea>
           
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSummaryDialog(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {infoMetricKey && (
        <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{METRIC_INFO_CONTENT[infoMetricKey].title}</AlertDialogTitle>
            </AlertDialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Typical Sources:</h4>
                  <p className="text-muted-foreground">{METRIC_INFO_CONTENT[infoMetricKey].sources}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Implications:</h4>
                  <p className="text-muted-foreground">{METRIC_INFO_CONTENT[infoMetricKey].implications}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Recommendations:</h4>
                  <p className="text-muted-foreground">
                    {
                      METRIC_INFO_CONTENT[infoMetricKey].recommendations[getCurrentMetricStatusForInfo(infoMetricKey)] ||
                      METRIC_INFO_CONTENT[infoMetricKey].recommendations.unknown
                    }
                  </p>
                </div>
              </div>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => { setShowInfoDialog(false); setInfoMetricKey(null); }}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}


      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
        AirCube &copy; {new Date().getFullYear()} - Air Quality Monitoring.
      </footer>
    </div>
  );
}

function CardSkeleton({ metricId }: { metricId: MetricKey}) { 
  return (
    <div className="p-6 rounded-lg border bg-card shadow-sm">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-5 w-2/4" /> 
        {/* Placeholder for Icon and Info Button */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
           <Skeleton className="h-4 w-4 rounded-sm" />
        </div>
      </div>
      <div>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

