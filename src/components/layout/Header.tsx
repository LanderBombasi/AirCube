
"use client";

import type { ConnectionStatus } from '@/types/airQuality';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, LoaderCircle, PlugZap, Bluetooth, ServerCrash } from 'lucide-react'; // Added ServerCrash

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

const ConnectionIcon = ({ status }: { status: ConnectionStatus }) => {
  switch (status) {
    case 'connected':
      return <Wifi className="h-5 w-5 text-green-500" />;
    case 'connecting':
      return <LoaderCircle className="h-5 w-5 animate-spin text-primary" />;
    case 'error':
      return <ServerCrash className="h-5 w-5 text-destructive" />; // Using ServerCrash for ESP32 connection error
    case 'disconnected':
    default:
      return <WifiOff className="h-5 w-5 text-muted-foreground" />;
  }
};

export function Header({ connectionStatus, onConnect, onDisconnect }: HeaderProps) {
  const canConnect = connectionStatus === 'disconnected' || connectionStatus === 'error';
  const canDisconnect = connectionStatus === 'connected';

  return (
    <header className="py-4 px-4 md:px-8 shadow-md bg-card">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
           <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity:1}} />
              </linearGradient>
            </defs>
            <rect width="70" height="70" x="15" y="15" rx="10" ry="10" fill="url(#grad1)" />
            <rect width="50" height="50" x="25" y="25" rx="5" ry="5" fill="hsl(var(--background))" />
             <text x="50" y="62" fontFamily="var(--font-geist-mono)" fontSize="30" fill="hsl(var(--primary))" textAnchor="middle">AC</text>
          </svg>
          <h1 className="text-2xl font-bold text-primary">AirCube</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-background">
            <ConnectionIcon status={connectionStatus} />
            <span className="text-sm capitalize text-foreground">{connectionStatus === 'error' ? 'Conn. Error' : connectionStatus}</span>
          </div>
          {canConnect && (
            <Button onClick={onConnect} disabled={connectionStatus === 'connecting'} variant="outline">
              <Bluetooth className="mr-2 h-4 w-4" /> Connect
            </Button>
          )}
          {canDisconnect && (
            <Button onClick={onDisconnect} variant="destructive">
              <PlugZap className="mr-2 h-4 w-4" /> Disconnect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
