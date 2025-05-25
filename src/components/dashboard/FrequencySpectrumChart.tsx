
"use client";

import * as React from "react";
import {
  BarChart as RechartsBarChart, // Renamed to avoid conflict with lucide-react icon
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { DFTResult } from "@/lib/fourierUtils";
import type { MetricConfig } from "@/types/airQuality";
import { BarChart2, Loader2, AlertTriangle } from 'lucide-react'; // Icons

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface FrequencySpectrumChartProps {
  dftData: DFTResult[] | null; // Allow null for loading/error states
  metricConfig: MetricConfig;
  isLoading: boolean;
}

export function FrequencySpectrumChart({
  dftData,
  metricConfig,
  isLoading,
}: FrequencySpectrumChartProps) {
  const chartConfig = {
    magnitude: {
      label: "Magnitude",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle>Frequency Spectrum: {metricConfig.label}</CardTitle>
          <CardDescription>
            Analyzing frequency components of recent {metricConfig.label} data.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center text-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
          <p className="text-lg font-semibold text-foreground">Calculating Spectrum...</p>
          <p className="text-sm text-muted-foreground">
            This may take a moment for longer data sets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!dftData || dftData.length === 0) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle>Frequency Spectrum: {metricConfig.label}</CardTitle>
          <CardDescription>
            Analysis of frequency components in {metricConfig.label} data.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center text-center">
          <BarChart2 className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Insufficient Data for Spectrum</p>
          <p className="text-sm text-muted-foreground">
            More historical readings are needed to perform frequency analysis.
            Or, there might have been an issue calculating the spectrum.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const magnitudes = dftData.map(p => p.magnitude);
  let yMax = Math.max(...magnitudes);
  const yMin = 0; 
  const padding = yMax * 0.1 || 1;
  yMax = Math.ceil(yMax + padding);


  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle>Frequency Spectrum: {metricConfig.label}</CardTitle>
        <CardDescription>
          Shows the strength (magnitude) of different frequency components in the recent historical data.
          The X-axis represents frequency bins (k). Higher k values correspond to higher frequencies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <RechartsBarChart
            accessibilityLayer
            data={dftData}
            margin={{
              left: 12,
              right: 12,
              top: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="frequencyIndex"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: "Frequency Bin (k)", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[yMin, yMax]}
              label={{ value: "Magnitude", angle: -90, position: "insideLeft" }}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
              content={({ active, payload, label }) =>
                active && payload && payload.length ? (
                  <ChartTooltipContent
                    hideLabel
                    label="" 
                    formatter={(value, name, item) => (
                      <>
                        <div className="font-medium">Bin {item.payload.frequencyIndex}</div>
                        <div className="text-muted-foreground">
                          Magnitude: {Number(item.payload.magnitude).toFixed(2)}
                        </div>
                        <div className="text-muted-foreground">
                          Phase: {Number(item.payload.phase).toFixed(2)} rad
                        </div>
                      </>
                    )}
                  />
                ) : null
              }
            />
            <Bar dataKey="magnitude" fill="var(--color-magnitude)" radius={4} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
