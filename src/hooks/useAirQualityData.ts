
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AirQualityData, ConnectionStatus, MetricKey } from '@/types/airQuality';
import { useToast } from "@/hooks/use-toast";
import { METRIC_CONFIGS, getMetricStatus } from '@/lib/constants';

const INITIAL_DATA: AirQualityData = {
  co2: 450,
  co: 5,
  temperature: 22,
  humidity: 50,
};

export function useAirQualityData() {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const { toast } = useToast();

  const connectDevice = useCallback(() => {
    setConnectionStatus('connecting');
    toast({ title: "Connecting...", description: "Attempting to connect to AirCube device." });
    setTimeout(() => {
      const success = Math.random() > 0.2; 
      if (success) {
        setConnectionStatus('connected');
        setData(INITIAL_DATA);
        toast({ title: "Connected!", description: "Successfully connected to AirCube.", variant: "default" });
      } else {
        setConnectionStatus('error');
        setData(null);
        toast({ title: "Connection Failed", description: "Could not connect to AirCube device.", variant: "destructive" });
      }
    }, 2000);
  }, [toast]);

  const disconnectDevice = useCallback(() => {
    setConnectionStatus('disconnected');
    setData(null);
    toast({ title: "Disconnected", description: "AirCube device has been disconnected." });
  }, [toast]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (connectionStatus === 'connected') {
      intervalId = setInterval(() => {
        setData((prevData) => {
          if (!prevData) return INITIAL_DATA; 

          const newData: AirQualityData = {
            co2: Math.max(300, Math.min(3000, prevData.co2 + Math.floor(Math.random() * 401) - 200)), // Fluctuate more to hit danger
            co: Math.max(0, Math.min(100, prevData.co + Math.floor(Math.random() * 11) - 5)),       // Fluctuate more
            temperature: parseFloat((prevData.temperature + (Math.random() * 4) - 2).toFixed(1)),   // Fluctuate more
            humidity: Math.max(10, Math.min(90, prevData.humidity + Math.floor(Math.random() * 21) - 10)), // Fluctuate more
          };

          // Check for transitions to danger status
          (Object.keys(METRIC_CONFIGS) as MetricKey[]).forEach((key) => {
            const metricConfig = METRIC_CONFIGS[key];
            const currentValue = newData[key];
            const previousValue = prevData ? prevData[key] : null;

            if (currentValue === null || currentValue === undefined) return;

            const currentStatus = getMetricStatus(key, currentValue);
            const previousStatus = (typeof previousValue === 'number') ? getMetricStatus(key, previousValue) : 'unknown';

            if (currentStatus === 'danger' && previousStatus !== 'danger') {
              toast({
                title: `⚠️ Critical Alert: ${metricConfig.label}`,
                description: `${metricConfig.label} is at ${currentValue}${metricConfig.unit}. Please take action.`,
                variant: "destructive",
                duration: 7000, 
              });
            }
          });

          return newData;
        });
      }, 3000); 
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connectionStatus, toast]); // Added toast to dependency array

  return { data, connectionStatus, connectDevice, disconnectDevice };
}

