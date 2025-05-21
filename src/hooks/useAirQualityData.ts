
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
  const listenerAttachedRef = useRef(false); // To track if the listener is active

  const connectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const handleDataUpdate = useCallback((snapshot: any) => {
    const rawData = snapshot.val();
    console.log(
      "Firebase snapshot received. Path:", FIREBASE_DATA_PATH,
      "Exists:", snapshot.exists(),
      "Raw data:", JSON.stringify(rawData, null, 2)
    );

    if (snapshot.exists()) {
      const newData = rawData as AirQualityData;
      setData(newData);

      if (previousDataRef.current) {
        (Object.keys(METRIC_CONFIGS) as MetricKey[]).forEach((key) => {
          const metricConfig = METRIC_CONFIGS[key];
          const currentValue = newData[key];

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
      if (connectionStatusRef.current === 'connected' && previousDataRef.current !== null) {
        // Only show this if we were connected and previously had data
        toast({ title: "Data Stream Interrupted", description: `No data currently at ${FIREBASE_DATA_PATH}. ESP32 might have stopped or data was deleted.`, variant: "destructive" });
      }
      previousDataRef.current = null;
    }
  }, [toast]);

  const handleError = useCallback((error: Error) => {
    console.error("Firebase data fetch error:", error.message, error);
    setConnectionStatus('error');
    setData(null);
    previousDataRef.current = null;
    listenerAttachedRef.current = false;
    if (dataRef.current) {
        // Detach the listener on error if it was set up
        off(dataRef.current);
        dataRef.current = null;
    }
    toast({ title: "Firebase Connection Error", description: `Error: ${error.message}. Check console and Firebase rules.`, variant: "destructive" });
  }, [toast]);

  const connectDevice = useCallback(() => {
    if (listenerAttachedRef.current || connectionStatusRef.current === 'connecting') {
      console.log("Connection attempt skipped: listener already attached or currently connecting.");
      return;
    }

    setConnectionStatus('connecting');
    toast({ title: "Connecting...", description: `Attempting to connect to Firebase for AirCube data at ${FIREBASE_DATA_PATH}.` });

    try {
      dataRef.current = ref(database, FIREBASE_DATA_PATH);

      const dataListener = (snapshot: any) => {
        if (!listenerAttachedRef.current) { // First time this listener runs for this connection attempt
          listenerAttachedRef.current = true; // Mark listener as active
          setConnectionStatus('connected'); // Set status to connected
          if (snapshot.exists()) {
            toast({ title: "Connected!", description: "Receiving data from AirCube via Firebase.", variant: "default" });
          } else {
            toast({ title: "Connected to Firebase", description: `Listening to ${FIREBASE_DATA_PATH}, but no data found yet. Waiting for ESP32.`, variant: "default" });
            console.log(`Firebase listener active for ${FIREBASE_DATA_PATH}, path is currently empty.`);
          }
        }
        handleDataUpdate(snapshot);
      };

      // Pass handleError directly as the error callback for onValue
      onValue(dataRef.current, dataListener, handleError);

    } catch (error: any) {
      console.error("Error setting up Firebase listener (synchronous):", error);
      // Ensure handleError is called for synchronous errors during setup too
      handleError(new Error(error.message || "Failed to initialize Firebase listener"));
    }
  }, [toast, handleDataUpdate, handleError]);


  const disconnectDevice = useCallback(() => {
    if (dataRef.current && listenerAttachedRef.current) {
      off(dataRef.current);
      console.log("Firebase listener detached for path:", dataRef.current.toString());
    }
    dataRef.current = null;
    listenerAttachedRef.current = false;
    setConnectionStatus('disconnected');
    setData(null);
    previousDataRef.current = null;
    toast({ title: "Disconnected", description: "Stopped listening for AirCube data from Firebase." });
  }, [toast]);

  useEffect(() => {
    // Cleanup listener on component unmount
    return () => {
      if (dataRef.current && listenerAttachedRef.current) {
        off(dataRef.current);
        console.log("Firebase listener cleaned up on unmount for path:", dataRef.current.toString());
      }
      listenerAttachedRef.current = false;
      dataRef.current = null;
    };
  }, []);

  return { data, connectionStatus, connectDevice, disconnectDevice };
}
