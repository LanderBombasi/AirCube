
"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { DFTResult } from "@/lib/fourierUtils";
import type { MetricConfig } from "@/types/airQuality";

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
  dftData: DFTResult[];
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
            Calculating Fourier Transform...
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Loading spectrum data...</p>
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
            Not enough historical data to calculate or display frequency spectrum.
            At least a few historical readings are needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Waiting for more data...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Determine Y-axis domain for magnitude with some padding
  // Exclude k=0 (DC component) for y-axis scaling if it's too large,
  // but still plot it. Or, use a log scale if appropriate (more complex).
  // For now, simple linear scale including DC.
  const magnitudes = dftData.map(p => p.magnitude);
  let yMax = Math.max(...magnitudes);
  const yMin = 0; // Magnitude is always non-negative
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
          <BarChart
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
                    label="" // Keep this empty as we customize the content
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
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
