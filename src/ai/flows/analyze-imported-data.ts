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
      'The imported data, which could be from a TXT, CSV, or the content extracted from an XLSX file. The data should contain lottery numbers, statistics, or user notes.'
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
  prompt: `You are an expert Lotomania analyst. Your task is to analyze the provided data, which may come from various file formats like TXT, CSV, or XLSX, and suggest intelligent bet combinations.

The data provided is:
\`\`\`
{{data}}
\`\`\`

Based on your analysis of this data, you will suggest {{numberOfBets}} bet combinations. Each bet must contain exactly 50 unique numbers, ranging from 0 to 99.

You must also provide a brief summary of your analysis, highlighting any trends, patterns, or key insights you discovered in the data that influenced your suggestions.

Please ensure your final response is a valid JSON object that strictly follows the specified output schema.
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
