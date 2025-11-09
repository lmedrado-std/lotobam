'use server';

/**
 * @fileOverview Suggests bet generation criteria based on popular strategies.
 *
 * - suggestBetCriteria - A function that suggests bet generation criteria.
 * - SuggestBetCriteriaInput - The input type for the suggestBetCriteria function.
 * - SuggestBetCriteriaOutput - The return type for the suggestBetCriteria function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBetCriteriaInputSchema = z.object({
  userQuery: z
    .string()
    .describe(
      'The user query describing the desired bet generation criteria or strategy.'
    ),
});
export type SuggestBetCriteriaInput = z.infer<typeof SuggestBetCriteriaInputSchema>;

const SuggestBetCriteriaOutputSchema = z.object({
  suggestedCriteria: z.string().describe('The suggested bet generation criteria based on popular strategies.'),
});
export type SuggestBetCriteriaOutput = z.infer<typeof SuggestBetCriteriaOutputSchema>;

export async function suggestBetCriteria(input: SuggestBetCriteriaInput): Promise<SuggestBetCriteriaOutput> {
  return suggestBetCriteriaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBetCriteriaPrompt',
  input: {schema: SuggestBetCriteriaInputSchema},
  output: {schema: SuggestBetCriteriaOutputSchema},
  prompt: `You are an expert in lottery strategies, particularly for Lotomania.
Based on the user's query, suggest bet generation criteria based on popular strategies.

User Query: {{{userQuery}}}

Suggested Criteria:`,
});

const suggestBetCriteriaFlow = ai.defineFlow(
  {
    name: 'suggestBetCriteriaFlow',
    inputSchema: SuggestBetCriteriaInputSchema,
    outputSchema: SuggestBetCriteriaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
