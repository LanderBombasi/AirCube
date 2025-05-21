
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AirQualityData, ConnectionStatus, MetricKey } from '@/types/airQuality';
import { useToast } from "@/hooks/use-toast";
import { METRIC_CONFIGS, getMetricStatus } from '@/lib/constants';
import { database } from '@/lib/firebaseConfig';
import { ref, onValue, off, DatabaseReference } from "firebase/database";

const FIREBASE_DATA_PATH = '/airQuality/liveData';

export function useAirQualityData() {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const { toast } = useToast();
  const dataRef = useRef<DatabaseReference | null>(null);
  const previousDataRef = useRef<AirQualityData | null>(null);

  const handleDataUpdate = useCallback((snapshot: any) => {
    if (snapshot.exists()) {
      const newData = snapshot.val() as AirQualityData;
      setData(newData);

      // Check for transitions to danger status
      if (previousDataRef.current) {
        (Object.keys(METRIC_CONFIGS) as MetricKey[]).forEach((key) => {
          const metricConfig = METRIC_CONFIGS[key];
          const currentValue = newData[key];
          const previousValue = previousDataRef.current ? previousDataRef.current[key] : null;

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
      }
      previousDataRef.current = newData; // Update previous data for next comparison

    } else {
      // Handle case where data path exists but has no data, or was deleted
      setData(null);
      if (connectionStatus === 'connected') { // Only show if we were previously connected
        toast({ title: "No Data", description: `No data found at ${FIREBASE_DATA_PATH}. Ensure ESP32 is sending data.`, variant: "destructive" });
      }
    }
  }, [toast, connectionStatus]);

  const handleError = useCallback((error: Error) => {
    console.error("Firebase data fetch error:", error);
    setConnectionStatus('error');
    setData(null);
    toast({ title: "Firebase Error", description: `Error fetching data: ${error.message}`, variant: "destructive" });
  }, [toast]);


  const connectDevice = useCallback(() => {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      return;
    }
    setConnectionStatus('connecting');
    toast({ title: "Connecting...", description: "Attempting to connect to Firebase for AirCube data." });

    try {
      dataRef.current = ref(database, FIREBASE_DATA_PATH);
      onValue(dataRef.current, (snapshot) => {
        if (connectionStatus !== 'connected') { // To avoid multiple "connected" toasts if data updates frequently
           setConnectionStatus('connected');
           toast({ title: "Connected!", description: "Receiving data from AirCube via Firebase.", variant: "default" });
        }
        handleDataUpdate(snapshot);
      }, (error) => {
        handleError(error);
        // Ensure listener is detached on error during initial setup
        if (dataRef.current) {
          off(dataRef.current);
          dataRef.current = null;
        }
      });
    } catch (error: any) {
      handleError(error);
    }
  }, [toast, handleDataUpdate, handleError, connectionStatus]);

  const disconnectDevice = useCallback(() => {
    if (dataRef.current) {
      off(dataRef.current);
      dataRef.current = null;
    }
    setConnectionStatus('disconnected');
    setData(null);
    previousDataRef.current = null;
    toast({ title: "Disconnected", description: "Stopped listening for AirCube data from Firebase." });
  }, [toast]);

  // Cleanup listener on component unmount
  useEffect(() => {
    return () => {
      if (dataRef.current) {
        off(dataRef.current);
      }
    };
  }, []);

  return { data, connectionStatus, connectDevice, disconnectDevice };
}
