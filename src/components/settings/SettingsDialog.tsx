
"use client";

import React from 'react';
import { useSettings, type CustomThresholdValues } from '@/contexts/SettingsContext';
import type { MetricKey } from '@/types/airQuality';
import { METRIC_CONFIGS as DEFAULT_METRIC_CONFIGS } from '@/lib/constants';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cog } from 'lucide-react';
import { Separator } from '../ui/separator';

const THRESHOLD_FIELD_LABELS: Record<keyof CustomThresholdValues, string> = {
  normalHigh: "Normal Max",
  warningLow: "Warning Min",
  warningHigh: "Warning Max",
  dangerLow: "Danger Min",
  dangerHigh: "Danger Max",
  idealLow: "Ideal Min",
  idealHigh: "Ideal Max",
};

const getRelevantThresholdKeys = (metricKey: MetricKey): (keyof CustomThresholdValues)[] => {
  // Simplified: show all possible keys. Could be refined based on metric type.
  if (metricKey === 'co2' || metricKey === 'co' || metricKey === 'combustible') {
    return ['normalHigh', 'dangerHigh'];
  }
  if (metricKey === 'humidity' || metricKey === 'temp') {
     return ['idealLow', 'idealHigh', 'warningLow', 'warningHigh', 'dangerLow', 'dangerHigh'];
  }
  return [];
};


export function SettingsDialog() {
  const { theme, setTheme, customThresholds, getThresholdsForMetric, updateThreshold, resetThresholds } = useSettings();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleThresholdChange = (metric: MetricKey, field: keyof CustomThresholdValues, value: string) => {
    updateThreshold(metric, field, value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Cog className="h-5 w-5" />
          <span className="sr-only">Open Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Customize your experience and alert preferences.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-200px)]">
          <div className="p-1">
            <Tabs defaultValue="theme" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="theme">Appearance</TabsTrigger>
                <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
              </TabsList>
              
              <TabsContent value="theme" className="py-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="theme-toggle" className="text-base font-semibold">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Toggle between light and dark themes.
                      </p>
                    </div>
                    <Switch
                      id="theme-toggle"
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>
                  {/* Placeholder for system theme if desired later
                  <div className="flex items-center justify-between rounded-lg border p-4">
                     <div>
                       <Label htmlFor="theme-system" className="text-base font-semibold">System Preference</Label>
                       <p className="text-sm text-muted-foreground">
                         Automatically match your system's appearance.
                       </p>
                     </div>
                     <Switch
                       id="theme-system"
                       checked={theme === 'system'}
                       onCheckedChange={(checked) => setTheme(checked ? 'system' : (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'))}
                     />
                   </div>
                   */}
                </div>
              </TabsContent>

              <TabsContent value="thresholds" className="py-4">
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground px-1">
                    Set custom alert thresholds for each metric. Empty fields will use default values.
                    Changes are saved automatically. For Temperature, custom values override seasonal defaults.
                  </p>
                  {(Object.keys(DEFAULT_METRIC_CONFIGS) as MetricKey[]).map((metricKey) => {
                    const currentMetricThresholds = getThresholdsForMetric(metricKey);
                    const relevantKeys = getRelevantThresholdKeys(metricKey);
                    
                    return (
                      <div key={metricKey} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-lg">{DEFAULT_METRIC_CONFIGS[metricKey].label}</h4>
                          <Button variant="outline" size="sm" onClick={() => resetThresholds(metricKey)}>
                            Reset to Default
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          {relevantKeys.map((fieldKey) => (
                            <div key={fieldKey} className="space-y-1">
                              <Label htmlFor={`${metricKey}-${fieldKey}`}>
                                {THRESHOLD_FIELD_LABELS[fieldKey]} ({DEFAULT_METRIC_CONFIGS[metricKey].unit})
                              </Label>
                              <Input
                                id={`${metricKey}-${fieldKey}`}
                                type="number"
                                placeholder={`Default: ${DEFAULT_METRIC_CONFIGS[metricKey].thresholds[fieldKey] ?? 'N/A'}`}
                                value={customThresholds[metricKey]?.[fieldKey]?.toString() ?? ''}
                                onChange={(e) => handleThresholdChange(metricKey, fieldKey, e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                   <div className="mt-6 flex justify-end">
                      <Button variant="destructive" onClick={() => resetThresholds()}>
                        Reset All Thresholds to Default
                      </Button>
                    </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

