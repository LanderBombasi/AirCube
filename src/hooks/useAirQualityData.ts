"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AirQualityData, ConnectionStatus } from '@/types/airQuality';
import { useToast } from "@/hooks/use-toast";

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
      // Simulate connection success/failure
      const success = Math.random() > 0.2; // 80% chance of success
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
          if (!prevData) return INITIAL_DATA; // Should not happen if connected
          // Simulate data fluctuations
          return {
            co2: Math.max(300, Math.min(3000, prevData.co2 + Math.floor(Math.random() * 101) - 50)), // Fluctuate by +/- 50
            co: Math.max(0, Math.min(100, prevData.co + Math.floor(Math.random() * 5) - 2)), // Fluctuate by +/- 2
            temperature: parseFloat((prevData.temperature + (Math.random() * 2) - 1).toFixed(1)), // Fluctuate by +/- 1
            humidity: Math.max(10, Math.min(90, prevData.humidity + Math.floor(Math.random() * 5) - 2)), // Fluctuate by +/- 2
          };
        });
      }, 3000); // Update data every 3 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connectionStatus]);

  return { data, connectionStatus, connectDevice, disconnectDevice };
}
