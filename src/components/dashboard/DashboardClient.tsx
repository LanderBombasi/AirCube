
"use client";

import { useAirQualityData } from '@/hooks/useAirQualityData';
import { DataCard } from './DataCard';
import { METRIC_CONFIGS, getMetricStatus } from '@/lib/constants';
import type { MetricKey } from '@/types/airQuality';
import { Header } from '@/components/layout/Header';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';

export function DashboardClient() {
  const { data, connectionStatus, connectDevice, disconnectDevice } = useAirQualityData();

  const metricKeys = Object.keys(METRIC_CONFIGS) as MetricKey[];

  if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header 
          connectionStatus={connectionStatus}
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
        onConnect={connectDevice}
        onDisconnect={disconnectDevice}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {connectionStatus === 'connecting' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {metricKeys.map((metricKey) => (
              <CardSkeleton key={metricKey} metricId={metricKey} />
            ))}
          </div>
        )}
        {connectionStatus === 'connected' && data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {metricKeys.map((key) => (
              <DataCard
                key={key}
                metricConfig={METRIC_CONFIGS[key]}
                value={data[key]}
                status={getMetricStatus(key, data[key])}
              />
            ))}
          </div>
        )}
      </main>
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
