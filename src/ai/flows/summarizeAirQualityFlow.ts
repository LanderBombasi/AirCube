
'use server';
/**
 * @fileOverview An AI flow to summarize historical air quality data.
 *
 * - getAirQualitySummary - A function that generates a summary of air quality.
 * - AirQualitySummaryInput - The input type for the getAirQualitySummary function.
 * - AirQualitySummaryOutput - The return type for the getAirQualitySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MetricKey } from '@/types/airQuality';

// Define the structure for individual historical readings
const HistoricalReadingSchema = z.object({
  timestamp: z.number().describe("The UNIX timestamp of the reading."),
  co2: z.number().nullable().describe("CO2 level in ppm."),
  co: z.number().nullable().describe("CO level in ppm."),
  combustible: z.number().nullable().describe("Combustible gas level in ppm."),
  temp: z.number().nullable().describe("Temperature in Celsius."),
  humidity: z.number().nullable().describe("Humidity in percentage."),
});

// Define the structure for metric configuration and thresholds
const MetricThresholdInfoSchema = z.string().describe("A human-readable string describing the metric, its unit, and its normal/warning/danger thresholds.");
const MetricsConfigurationSchema = z.record(z.nativeEnum(MetricKey), MetricThresholdInfoSchema)
  .describe("An object where keys are metric identifiers (e.g., 'co2', 'temp') and values are strings describing their thresholds.");


const AirQualitySummaryInputSchema = z.object({
  historicalReadings: z.array(HistoricalReadingSchema).describe("An array of recent air quality readings."),
  timePeriodDescription: z.string().describe("A string describing the time period covered by the historical readings, e.g., 'the last hour', 'the past 60 readings'."),
  metricsConfiguration: MetricsConfigurationSchema,
});
export type AirQualitySummaryInput = z.infer<typeof AirQualitySummaryInputSchema>;

const AirQualitySummaryOutputSchema = z.object({
  summary: z.string().describe("A concise, human-readable summary of the air quality data."),
});
export type AirQualitySummaryOutput = z.infer<typeof AirQualitySummaryOutputSchema>;

export async function getAirQualitySummary(input: AirQualitySummaryInput): Promise<AirQualitySummaryOutput> {
  return summarizeAirQualityFlow(input);
}

const summarizeAirQualityPrompt = ai.definePrompt({
  name: 'summarizeAirQualityPrompt',
  input: { schema: AirQualitySummaryInputSchema },
  output: { schema: AirQualitySummaryOutputSchema },
  prompt: `
    You are an AI Air Quality Analyst. Your task is to provide a concise, easy-to-understand summary of the provided air quality data for a home environment. 
    The data covers {{timePeriodDescription}}.

    Current Metric Thresholds for context:
    {{#each metricsConfiguration}}
    - {{@key}}: {{this}}
    {{/each}}

    Historical Data:
    {{#if historicalReadings.length}}
      {{#each historicalReadings}}
      - Timestamp: {{timestamp}}, CO2: {{co2}}ppm, CO: {{co}}ppm, Combustible: {{combustible}}ppm, Temp: {{temp}}°C, Humidity: {{humidity}}%
      {{/each}}
    {{else}}
      No historical data provided.
    {{/if}}

    Based on this data and the provided thresholds:
    1. Briefly describe the overall air quality.
    2. Highlight any significant trends or notable fluctuations for key metrics (CO2, CO, Combustible Gas, Temperature, Humidity).
    3. Mention any periods where metrics went into warning or danger levels based on the provided thresholds.
    4. If data is sparse or insufficient for a detailed analysis, state that.
    5. Keep the summary to 2-4 sentences. Be informative but not overly technical.
    
    Generate the summary.
  `,
});

const summarizeAirQualityFlow = ai.defineFlow(
  {
    name: 'summarizeAirQualityFlow',
    inputSchema: AirQualitySummaryInputSchema,
    outputSchema: AirQualitySummaryOutputSchema,
  },
  async (input) => {
    if (!input.historicalReadings || input.historicalReadings.length === 0) {
      return { summary: "Not enough historical data available to generate a summary." };
    }
    
    // Filter out readings where all values are null, if any (though typically historicalData has values)
    const validReadings = input.historicalReadings.filter(r => 
      r.co2 !== null || r.co !== null || r.combustible !== null || r.temp !== null || r.humidity !== null
    );

    if (validReadings.length < 5) { // Require at least a few data points for a meaningful summary
        return { summary: "Insufficient historical data for a detailed summary. More readings are needed."};
    }

    const { output } = await summarizeAirQualityPrompt(input);
    return output!;
  }
);

