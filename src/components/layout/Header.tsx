
"use client";

import type { ConnectionStatus } from '@/types/airQuality';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, LoaderCircle, PlugZap, Bluetooth, ServerCrash, Cog } from 'lucide-react';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import Image from 'next/image';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  lastUpdateTime: number | null;
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
      return <ServerCrash className="h-5 w-5 text-destructive" />;
    case 'disconnected':
    default:
      return <WifiOff className="h-5 w-5 text-muted-foreground" />;
  }
};

export function Header({ connectionStatus, lastUpdateTime, onConnect, onDisconnect }: HeaderProps) {
  const canConnect = connectionStatus === 'disconnected' || connectionStatus === 'error';
  const canDisconnect = connectionStatus === 'connected';

  return (
    <header className="py-4 px-4 md:px-8 shadow-md bg-card">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image 
            src="/AirCube_Icon.png" 
            alt="AirCube Logo" 
            width={32} 
            height={32}
            className="rounded-sm" 
          />
          <h1 className="text-2xl font-bold text-primary">AirCube</h1>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdateTime && connectionStatus === 'connected' && (
            <div className="text-xs text-muted-foreground hidden md:block">
              Updated: {new Date(lastUpdateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
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
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
}
