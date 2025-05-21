
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
  const listenerAttachedRef = useRef(false);

  const connectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const handleDataUpdate = useCallback((snapshot: any) => {
    const rawData = snapshot.val();
    console.log(
      "[AirQualityData] Firebase snapshot received. Path:", snapshot.ref.toString(),
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
            console.warn(`[AirQualityData] Metric ${key} is not a number or is undefined. Value:`, currentValue);
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
        toast({ title: "Data Stream Interrupted", description: `No data currently at ${FIREBASE_DATA_PATH}. ESP32 might have stopped or data was deleted.`, variant: "destructive" });
        console.warn(`[AirQualityData] Data stream interrupted. No data at ${FIREBASE_DATA_PATH}.`);
      }
      previousDataRef.current = null;
    }
  }, [toast]);

  const handleError = useCallback((error: Error) => {
    console.error("[AirQualityData] Firebase data fetch error callback triggered. Full error object:", error);
    console.error("[AirQualityData] Error name:", error.name, "Error message:", error.message, "Stack:", error.stack);
    
    setConnectionStatus('error');
    setData(null);
    previousDataRef.current = null;
    
    if (dataRef.current && listenerAttachedRef.current) { // Check if listener was attached before trying to detach
        console.log("[AirQualityData] Detaching listener due to error for path:", dataRef.current.toString());
        off(dataRef.current);
    } else {
        console.log("[AirQualityData] Listener was not attached or dataRef is null, no detachment needed on error.");
    }
    listenerAttachedRef.current = false; // Ensure it's marked as not attached
    dataRef.current = null; // Clear the ref

    toast({ title: "Firebase Connection Error", description: `Error: ${error.message}. Check console and Firebase rules.`, variant: "destructive" });
  }, [toast]);

  const connectDevice = useCallback(() => {
    console.log("[AirQualityData] connectDevice called. Current status:", connectionStatusRef.current, "Listener attached:", listenerAttachedRef.current);

    if (!database) {
      console.error("[AirQualityData] Firebase database instance is not available. Check firebaseConfig.ts.");
      toast({ title: "Configuration Error", description: "Firebase database not initialized.", variant: "destructive" });
      setConnectionStatus('error');
      return;
    }

    if (listenerAttachedRef.current || connectionStatusRef.current === 'connecting') {
      console.log("[AirQualityData] Connection attempt skipped: listener already attached or currently connecting.");
      return;
    }

    setConnectionStatus('connecting');
    console.log(`[AirQualityData] Status set to 'connecting'. Attempting to connect to Firebase for AirCube data at ${FIREBASE_DATA_PATH}.`);
    toast({ title: "Connecting...", description: `Attempting to connect to Firebase for AirCube data at ${FIREBASE_DATA_PATH}.` });

    try {
      console.log("[AirQualityData] Creating Firebase database reference for path:", FIREBASE_DATA_PATH);
      dataRef.current = ref(database, FIREBASE_DATA_PATH);
      console.log("[AirQualityData] Database reference created:", dataRef.current.toString());

      const dataListener = (snapshot: any) => {
        console.log("[AirQualityData] 'onValue' success callback (dataListener) invoked. Snapshot exists:", snapshot.exists());
        if (!listenerAttachedRef.current) {
          listenerAttachedRef.current = true;
          setConnectionStatus('connected');
          console.log("[AirQualityData] Listener attached, status set to 'connected'.");
          if (snapshot.exists()) {
            toast({ title: "Connected!", description: "Receiving data from AirCube via Firebase.", variant: "default" });
            console.log("[AirQualityData] Successfully connected, data found.");
          } else {
            toast({ title: "Connected to Firebase", description: `Listening to ${FIREBASE_DATA_PATH}, but no data found yet. Waiting for ESP32.`, variant: "default" });
            console.log(`[AirQualityData] Firebase listener active for ${FIREBASE_DATA_PATH}, path is currently empty.`);
          }
        }
        handleDataUpdate(snapshot);
      };
      
      console.log("[AirQualityData] Calling 'onValue' to attach listener...");
      onValue(dataRef.current, dataListener, handleError); // handleError is the direct error callback
      console.log("[AirQualityData] 'onValue' listener attachment initiated.");

    } catch (error: any) {
      console.error("[AirQualityData] Synchronous error during 'connectDevice' (e.g., ref creation):", error);
      // Call handleError to ensure consistent error state management
      handleError(new Error(error.message || "Failed to initialize Firebase listener during connectDevice"));
    }
  }, [toast, handleDataUpdate, handleError]);


  const disconnectDevice = useCallback(() => {
    console.log("[AirQualityData] disconnectDevice called.");
    if (dataRef.current && listenerAttachedRef.current) {
      off(dataRef.current);
      console.log("[AirQualityData] Firebase listener detached for path:", dataRef.current.toString());
    } else {
      console.log("[AirQualityData] No active listener to detach or dataRef is null.");
    }
    dataRef.current = null;
    listenerAttachedRef.current = false;
    setConnectionStatus('disconnected');
    setData(null);
    previousDataRef.current = null;
    console.log("[AirQualityData] Status set to 'disconnected'.");
    toast({ title: "Disconnected", description: "Stopped listening for AirCube data from Firebase." });
  }, [toast]);

  useEffect(() => {
    console.log("[AirQualityData] Hook mounted.");
    return () => {
      console.log("[AirQualityData] Hook unmounting. Cleaning up listener.");
      if (dataRef.current && listenerAttachedRef.current) {
        off(dataRef.current);
        console.log("[AirQualityData] Firebase listener cleaned up on unmount for path:", dataRef.current.toString());
      }
      listenerAttachedRef.current = false;
      dataRef.current = null;
    };
  }, []);

  return { data, connectionStatus, connectDevice, disconnectDevice };
}
