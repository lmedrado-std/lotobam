
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

const StatsSchema = z.object({
  hotNumbers: z.array(z.number()).describe('The most frequent numbers.'),
  coldNumbers: z.array(z.number()).describe('The least frequent numbers.'),
});


const AnalyzeImportedDataInputSchema = z.object({
  stats: StatsSchema.describe('The statistics derived from the imported file.'),
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
  prompt: `You are an expert Lotomania analyst. Your task is to analyze the provided statistics and suggest intelligent bet combinations.

The statistics provided are:
- Hot Numbers (most frequent): {{stats.hotNumbers}}
- Cold Numbers (least frequent): {{stats.coldNumbers}}

Based on your analysis of this data, you will suggest {{numberOfBets}} bet combinations. Each bet must contain exactly 50 unique numbers, ranging from 0 to 99.

You must also provide a brief summary of your analysis, highlighting how you used the hot and cold numbers to influence your suggestions.

Your final response MUST be a valid JSON object that strictly follows the specified output schema. Do not include any other text or formatting outside of the JSON object.
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

    