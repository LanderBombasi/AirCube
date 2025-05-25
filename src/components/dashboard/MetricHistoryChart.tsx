
"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Line,
  LineChart as RechartsLineChart, // Renamed to avoid conflict with lucide-react icon
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { HistoricalDataPoint, MetricKey, MetricConfig } from "@/types/airQuality";
import { METRIC_CONFIGS } from "@/lib/constants";
import { LineChartIcon } from 'lucide-react'; // Icon for empty state

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

interface MetricHistoryChartProps {
  historicalData: HistoricalDataPoint[];
  selectedMetric: MetricKey;
}

export function MetricHistoryChart({
  historicalData,
  selectedMetric,
}: MetricHistoryChartProps) {
  const metricConfig = METRIC_CONFIGS[selectedMetric];

  const chartData = historicalData.map(point => ({
    timestamp: point.timestamp,
    [selectedMetric]: point[selectedMetric],
  }));
  
  const chartSpecificConfig = {
    [selectedMetric]: {
      label: metricConfig.label,
      color: "hsl(var(--accent))", 
    },
  } satisfies ChartConfig;


  if (!historicalData || historicalData.length < 2) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle>History: {metricConfig.label}</CardTitle>
          <CardDescription>
            Historical trend of {metricConfig.label}.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center text-center">
          <LineChartIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Not Enough Data</p>
          <p className="text-sm text-muted-foreground">
            At least two historical readings are needed to display a chart.
            Keep your AirCube connected to gather more data.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const numericValues = historicalData
    .map(p => p[selectedMetric])
    .filter(v => typeof v === 'number' && !isNaN(v)) as number[];

  let yMin = 0;
  let yMax = 100; 

  if (numericValues.length > 0) {
    yMin = Math.min(...numericValues);
    yMax = Math.max(...numericValues);
    const padding = (yMax - yMin) * 0.1 || 1; 
    yMin = Math.floor(yMin - padding);
    yMax = Math.ceil(yMax + padding);
    if (yMin === yMax) { 
        yMin -= 1;
        yMax +=1;
    }
  }


  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle>History: {metricConfig.label}</CardTitle>
        <CardDescription>
          Showing the last {historicalData.length} readings for {metricConfig.label}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartSpecificConfig} className="h-[300px] w-full">
          <RechartsLineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(new Date(value), "HH:mm:ss")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}${metricConfig.unit}`}
              domain={[yMin, yMax]}
            />
            <RechartsTooltip
              cursor={true}
              content={<ChartTooltipContent indicator="line" hideLabel />}
            />
            <Line
              dataKey={selectedMetric}
              type="monotone"
              stroke={`var(--color-${selectedMetric})`}
              strokeWidth={2}
              dot={false}
              connectNulls={false} 
            />
          </RechartsLineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
