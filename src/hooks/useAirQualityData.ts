
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

  // Ref to hold the current connection status for use inside onValue listener
  const connectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const handleDataUpdate = useCallback((snapshot: any) => {
    const rawData = snapshot.val();
    // Enhanced console log for debugging
    console.log(
      "Firebase snapshot received. Path:", FIREBASE_DATA_PATH, 
      "Exists:", snapshot.exists(), 
      "Raw data:", JSON.stringify(rawData, null, 2) // Stringify for better readability of objects
    );

    if (snapshot.exists()) {
      const newData = rawData as AirQualityData;
      setData(newData);

      // Check for transitions to danger status
      if (previousDataRef.current) {
        (Object.keys(METRIC_CONFIGS) as MetricKey[]).forEach((key) => {
          const metricConfig = METRIC_CONFIGS[key];
          const currentValue = newData[key];

          // Ensure currentValue is a number before processing
          if (typeof currentValue !== 'number') {
            console.warn(`Metric ${key} is not a number or is undefined. Value:`, currentValue);
            return; 
          }
          
          const previousValue = previousDataRef.current ? previousDataRef.current[key] : null;

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
      previousDataRef.current = newData;
    } else {
      setData(null);
      previousDataRef.current = null;
      if (connectionStatusRef.current === 'connected') { 
        toast({ title: "Data Disappeared", description: `No data found at ${FIREBASE_DATA_PATH}. ESP32 might have stopped or data deleted.`, variant: "destructive" });
      }
    }
  }, [toast]); // Removed connectionStatus, using connectionStatusRef inside listeners

  const handleError = useCallback((error: Error) => {
    console.error("Firebase data fetch error:", error.message, error);
    setConnectionStatus('error');
    setData(null);
    previousDataRef.current = null;
    toast({ title: "Firebase Error", description: `Error fetching data: ${error.message}. Check console for details.`, variant: "destructive" });
  }, [toast]);

  const connectDevice = useCallback(() => {
    if (connectionStatusRef.current === 'connected' || connectionStatusRef.current === 'connecting') {
      return;
    }
    setConnectionStatus('connecting'); // This will update connectionStatusRef via its useEffect
    toast({ title: "Connecting...", description: `Attempting to connect to Firebase for AirCube data at ${FIREBASE_DATA_PATH}.` });

    try {
      dataRef.current = ref(database, FIREBASE_DATA_PATH);
      
      const dataListener = (snapshot: any) => {
        // Use connectionStatusRef.current to check status inside the listener
        if (connectionStatusRef.current === 'connecting') {
          if (snapshot.exists()) {
            setConnectionStatus('connected'); // Update the actual state
            toast({ title: "Connected!", description: "Receiving data from AirCube via Firebase.", variant: "default" });
          } else {
            // Initial connection, but no data yet.
            // This could be transient. If it persists, an error or specific message might be needed.
            console.log(`Connected to Firebase path ${FIREBASE_DATA_PATH}, but it's currently empty.`);
          }
        }
        handleDataUpdate(snapshot);
      };
      
      const errorListener = (error: Error) => {
        handleError(error);
        // It's good practice to detach listeners if an error makes them useless
        if (dataRef.current) {
          off(dataRef.current, 'value', dataListener);
        }
        dataRef.current = null; // Ensure we don't try to detach again if already errored
      };

      onValue(dataRef.current, dataListener, errorListener);

    } catch (error: any) { // Catch synchronous errors from `ref()` or initial `onValue` setup
      console.error("Error setting up Firebase listener:", error);
      handleError(error);
    }
  }, [toast, handleDataUpdate, handleError]);


  const disconnectDevice = useCallback(() => {
    if (dataRef.current) {
      off(dataRef.current); // Removes all 'value' listeners on this specific ref
      console.log("Firebase listener detached for path:", dataRef.current.toString());
      dataRef.current = null;
    }
    setConnectionStatus('disconnected');
    setData(null);
    previousDataRef.current = null;
    toast({ title: "Disconnected", description: "Stopped listening for AirCube data from Firebase." });
  }, [toast]);

  // Cleanup listener on component unmount
  useEffect(() => {
    const currentDbRef = dataRef.current; 
    return () => {
      if (currentDbRef) {
        off(currentDbRef);
        console.log("Firebase listener cleaned up on unmount for path:", currentDbRef.toString());
      }
    };
  }, []);

  return { data, connectionStatus, connectDevice, disconnectDevice };
}
