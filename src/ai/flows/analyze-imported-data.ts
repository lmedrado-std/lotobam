'use server';

/**
 * @fileOverview An AI agent for analyzing imported statistical data and suggesting intelligent bet combinations.
 *
 * - analyzeImportedData - A function that handles the analysis of imported data and suggests bet combinations.
 * - AnalyzeImportedDataInput - The input type for the analyzeImportedData function.
 * - AnalyzeImportedDataOutput - The return type for the analyzeImportedData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImportedDataInputSchema = z.object({
  data: z
    .string()
    .describe(
      'The imported statistical data, expected to be in CSV or TXT format. Data should contain number, frequency and last_draw_date columns.'
    ),
  numberOfBets: z
    .number()
    .describe('The number of bet combinations to suggest.'),
});
export type AnalyzeImportedDataInput = z.infer<typeof AnalyzeImportedDataInputSchema>;

const AnalyzeImportedDataOutputSchema = z.object({
  suggestions: z
    .array(z.array(z.number()))
    .describe('An array of suggested bet combinations, each containing 50 unique numbers.'),
  analysis: z
    .string()
    .describe('A summary of the data analysis performed, including key trends and insights.'),
});
export type AnalyzeImportedDataOutput = z.infer<typeof AnalyzeImportedDataOutputSchema>;

export async function analyzeImportedData(input: AnalyzeImportedDataInput): Promise<AnalyzeImportedDataOutput> {
  return analyzeImportedDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImportedDataPrompt',
  input: {schema: AnalyzeImportedDataInputSchema},
  output: {schema: AnalyzeImportedDataOutputSchema},
  prompt: `You are an expert lotto analyst. You will analyze the provided lotto statistics data and suggest bet combinations based on the data.

The input data is in CSV or TXT format and contains number, frequency, and last_draw_date columns.

Data:
{{data}}

You will suggest {{numberOfBets}} bet combinations. Each bet combination must have 50 unique numbers between 0 and 99.

You should also include a summary of the data analysis performed, including key trends and insights.

Ensure the response can be parsed as valid JSON.
`,
});

const analyzeImportedDataFlow = ai.defineFlow(
  {
    name: 'analyzeImportedDataFlow',
    inputSchema: AnalyzeImportedDataInputSchema,
    outputSchema: AnalyzeImportedDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
