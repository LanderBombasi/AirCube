
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAirQualityData } from '@/hooks/useAirQualityData';
import { DataCard } from './DataCard';
import { METRIC_CONFIGS as DEFAULT_METRIC_CONFIGS, getMetricStatus } from '@/lib/constants';
import type { MetricKey, MetricConfig, HistoricalDataPoint } from '@/types/airQuality';
import { Header } from '@/components/layout/Header';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiOff, Brain, BellRing } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';


// !!! IMPORTANT: REPLACE WITH YOUR OWN VAPID PUBLIC KEY !!!
// Generate VAPID keys (public and private) - there are many online tools or libraries for this.
// The public key is used by the browser to subscribe.
// The private key is used by your server to send push messages.
const VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY_HERE_REPLACE_ME"; 

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


export function DashboardClient() {
  const { data, historicalData, connectionStatus, lastUpdateTime, connectDevice, disconnectDevice } = useAirQualityData();
  const [selectedMetricForChart, setSelectedMetricForChart] = useState<MetricKey>('co2');
  const [dftResults, setDftResults] = useState<DFTResult[] | null>(null);
  const [isCalculatingDFT, setIsCalculatingDFT] = useState<boolean>(false);
  const { getThresholdsForMetric } = useSettings(); 
  const { toast } = useToast();

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState<boolean>(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushSubscriptionError, setPushSubscriptionError] = useState<string | null>(null);


  const metricKeys = Object.keys(DEFAULT_METRIC_CONFIGS) as MetricKey[];

  // Push Notification Setup
  const registerServiceWorkerAndSubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSubscriptionError("Push notifications are not supported by your browser.");
      toast({ title: "Push Notifications Not Supported", variant: "destructive" });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered with scope:', registration.scope);

      if (registration.active) { // Ensure service worker is active
          const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log('Push Subscription:', JSON.stringify(subscription));
        // TODO: Send this subscription object to your backend server to store it.
        // e.g., fetch('/api/subscribe-push', { method: 'POST', body: JSON.stringify(subscription), headers: {'Content-Type': 'application/json'} });
        setIsPushSubscribed(true);
        setPushSubscriptionError(null);
        toast({ title: "Subscribed to Push Notifications!" });
      } else {
        // This might happen on first load if the SW isn't active yet.
        // Could add a delay or listen for SW activation.
        console.warn('Service Worker is registered but not active yet. Subscription might fail or be delayed.');
        setPushSubscriptionError("Service worker not active yet. Try again shortly.");
        toast({ title: "Push Subscription Pending", description:"Service worker activating. Please try subscribing again in a moment if it fails.", variant: "default" });
      }

    } catch (error) {
      console.error('Service Worker registration or Push Subscription failed:', error);
      let errorMessage = "Failed to subscribe to push notifications.";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Permission for notifications was denied.";
        } else {
          errorMessage = error.message;
        }
      }
      setPushSubscriptionError(errorMessage);
      toast({ title: "Push Subscription Failed", description: errorMessage, variant: "destructive" });
      setIsPushSubscribed(false);
    }
  }, [toast]);

  const handleRequestNotificationPermission = useCallback(async () => {
    if (VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE_REPLACE_ME") {
      toast({
        title: "VAPID Key Missing",
        description: "Please replace the placeholder VAPID_PUBLIC_KEY in DashboardClient.tsx.",
        variant: "destructive",
        duration: 7000,
      });
      setPushSubscriptionError("VAPID public key is not configured in the client code.");
      return;
    }

    if (!('Notification' in window)) {
      setPushSubscriptionError("Notifications are not supported by your browser.");
      toast({ title: "Notifications Not Supported", variant: "destructive" });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: "Notification Permission Granted!" });
      await registerServiceWorkerAndSubscribe();
    } else if (permission === 'denied') {
      setPushSubscriptionError("Notification permission was denied.");
      toast({ title: "Notification Permission Denied", variant: "destructive" });
    } else {
      setPushSubscriptionError("Notification permission was dismissed.");
      toast({ title: "Notification Permission Dismissed", variant: "default" });
    }
  }, [toast, registerServiceWorkerAndSubscribe]);

  // Check current subscription status on mount
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setIsPushSubscribed(true);
            console.log('Already subscribed:', JSON.stringify(subscription));
          }
        });
      });
    }
  }, []);


  useEffect(() => {
    const performDFTCalculation = async () => {
      if (historicalData && historicalData.length > 1) {
        setIsCalculatingDFT(true);
        const metricValues = historicalData.map(point => point[selectedMetricForChart]).filter(val => typeof val === 'number') as number[];
        
        if (metricValues.length > 1) {
          try {
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

            <div className="mt-8 mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
              <Button 
                onClick={handleGenerateSummary} 
                disabled={isGeneratingSummary || !historicalData || historicalData.length === 0}
                variant="outline"
                size="lg"
              >
                <Brain className="mr-2 h-5 w-5" />
                {isGeneratingSummary ? "Generating Summary..." : "Get AI Air Quality Summary"}
              </Button>
              {!isPushSubscribed && (
                <Button
                  onClick={handleRequestNotificationPermission}
                  variant="outline"
                  size="lg"
                  disabled={VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE_REPLACE_ME"}
                >
                  <BellRing className="mr-2 h-5 w-5" />
                  Enable Push Notifications
                </Button>
              )}
              {isPushSubscribed && (
                 <p className="text-sm text-green-600 flex items-center"><BellRing className="mr-2 h-5 w-5 text-green-500" />Push notifications enabled.</p>
              )}
               {VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE_REPLACE_ME" && !isPushSubscribed && (
                 <p className="text-xs text-destructive">Push notifications disabled: VAPID key not configured in client code.</p>
              )}
              {pushSubscriptionError && (
                <p className="text-sm text-destructive">{pushSubscriptionError}</p>
              )}
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

      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
        AirCube &copy; {new Date().getFullYear()} - Air Quality Monitoring.
      </footer>
    </div>
  );
}

function CardSkeleton({ metricId }: { metricId: string}) {
  return (
    <div className="p-6 rounded-lg border bg-card shadow-sm">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-5 w-2/4" /> 
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
