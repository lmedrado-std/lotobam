
'use server';

/**
 * @fileOverview An AI agent for suggesting lottery bets based on historical results and a chosen strategy.
 *
 * - suggestBetsFromHistory - A function that analyzes historical data to suggest new bets.
 * - SuggestBetsFromHistoryInput - The input type for the suggestBetsFromHistory function.
 * - SuggestBetsFromHistoryOutput - The return type for the suggestBetsFromHistory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StatsSchema = z.object({
  hotNumbers: z.array(z.number()).describe('The most frequent numbers.'),
  coldNumbers: z.array(z.number()).describe('The least frequent numbers.'),
});


const SuggestBetsFromHistoryInputSchema = z.object({
  stats: StatsSchema.describe('The statistics derived from the historical data.'),
  strategy: z
    .string()
    .describe('The strategy to use for generating bets. Can be "hot", "cold", or "balanced".'),
  numberOfBets: z
    .number()
    .describe('The number of bet combinations to suggest.'),
  manualExclusion: z.array(z.number()).describe('An optional list of numbers to manually exclude from suggestions.'),
});
export type SuggestBetsFromHistoryInput = z.infer<typeof SuggestBetsFromHistoryInputSchema>;

const SuggestBetsFromHistoryOutputSchema = z.object({
  suggestions: z
    .array(z.array(z.number()))
    .describe('An array of suggested bet combinations, each containing 50 unique numbers.'),
  analysis: z
    .string()
    .describe('A brief summary of the analysis performed and the reasoning behind the suggestions.'),
});
export type SuggestBetsFromHistoryOutput = z.infer<typeof SuggestBetsFromHistoryOutputSchema>;

export async function suggestBetsFromHistory(input: SuggestBetsFromHistoryInput): Promise<SuggestBetsFromHistoryOutput> {
  return suggestBetsFromHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBetsFromHistoryPrompt',
  input: { schema: SuggestBetsFromHistoryInputSchema },
  output: { schema: SuggestBetsFromHistoryOutputSchema },
  prompt: `You are a specialist lottery analyst for the Brazilian Lotomania. Your task is to analyze historical statistics and suggest new bets based on a specific strategy.

  Statistics from Historical Data:
  - Hot Numbers (most frequent): {{stats.hotNumbers}}
  - Cold Numbers (least frequent): {{stats.coldNumbers}}
  
  User's Request:
  - Strategy: {{strategy}}
  - Number of Bets to Generate: {{numberOfBets}}
  - Numbers to Manually Exclude: {{#if manualExclusion}}{{manualExclusion}}{{else}}None{{/if}}

  Your Task:
  1.  Generate {{numberOfBets}} new bet suggestions based on the chosen strategy:
      - "hot": Prioritize the "hot" numbers provided.
      - "cold": Prioritize the "cold" numbers provided.
      - "balanced": Create a mix of hot and cold numbers, and also include some numbers from the mid-range of frequency.

  2.  Each bet MUST contain exactly 50 unique numbers.
      - The numbers must be between 0 and 99 (inclusive).

  3.  You MUST NOT use any of the numbers from the "Numbers to Manually Exclude" list in your suggestions.

  4.  Provide a brief analysis explaining your choices. For example, mention a few hot or cold numbers you used and how you incorporated the strategy.

  5.  Return the response in a valid JSON object with the keys "suggestions" (an array of number arrays) and "analysis" (a string). Ensure the JSON is well-formed.
  `,
});


const suggestBetsFromHistoryFlow = ai.defineFlow(
  {
    name: 'suggestBetsFromHistoryFlow',
    inputSchema: SuggestBetsFromHistoryInputSchema,
    outputSchema: SuggestBetsFromHistoryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
