'use server';

/**
 * @fileOverview An AI agent for suggesting lottery bets based on historical results and a chosen strategy.
 *
 * - suggestBetsFromHistory - A function that analyzes historical data to suggest new bets.
 * - SuggestBetsFromHistoryInput - The input type for the suggestBetsFromHistory function.
 * - SuggestBetsFromHistoryOutput - The return type for the suggestBetsFromHistory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestBetsFromHistoryInputSchema = z.object({
  history: z
    .array(z.any())
    .describe('An array of past lottery results. Each result should be an object with a "numeros" property containing an array of numbers.'),
  strategy: z
    .string()
    .describe('The strategy to use for generating bets. Can be "hot", "cold", or "balanced".'),
  numberOfBets: z
    .number()
    .describe('The number of bet combinations to suggest.'),
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
  prompt: `You are a specialist lottery analyst for the Brazilian Lotomania. Your task is to analyze historical draw data and suggest new bets based on a specific strategy.

  Historical Data:
  You will receive a JSON array of past results. Each result has a 'numeros' field, which is an array of the 20 numbers drawn in that contest.
  
  {{{json history}}}

  User's Request:
  - Strategy: {{strategy}}
  - Number of Bets to Generate: {{numberOfBets}}

  Your Task:
  1.  Analyze the provided history based on the chosen strategy:
      - "hot": Identify numbers that have appeared most frequently in the recent draws. Your suggestions should prioritize these "hot" numbers.
      - "cold": Identify numbers that have appeared least frequently or are on a long streak of not being drawn. Your suggestions should focus on these "cold" numbers.
      - "balanced": Create a mix of hot and cold numbers, and also include some numbers from the mid-range of frequency. Aim for a well-rounded ticket.

  2.  Generate {{numberOfBets}} new bet suggestions.
      - Each bet MUST contain exactly 50 unique numbers.
      - The numbers must be between 0 and 99 (inclusive, but Lotomania is 0-99, so 100 is not a valid number).

  3.  Provide a brief analysis explaining your choices. For example, mention a few hot or cold numbers you identified and how you used them.

  4.  Return the response in a valid JSON object with the keys "suggestions" (an array of number arrays) and "analysis" (a string).
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
