
'use server';

/**
 * @fileOverview An AI agent for parsing lottery result files.
 *
 * - analyzeImportedData - A function that parses a text file containing lottery results.
 * - AnalyzeImportedDataInput - The input type for the analyzeImportedData function.
 * - AnalyzeImportedDataOutput - The return type for the analyzeImportedData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';


const AnalyzeImportedDataInputSchema = z.object({
  fileContent: z.string().describe('The pre-processed text content of the lottery results file, containing only data lines.'),
});
export type AnalyzeImportedDataInput = z.infer<typeof AnalyzeImportedDataInputSchema>;


const AnalyzeImportedDataOutputSchema = z.object({
  results: z.array(z.array(z.number())).describe('An array where each inner array contains the 20 drawn numbers for a single contest.'),
});
export type AnalyzeImportedDataOutput = z.infer<typeof AnalyzeImportedDataOutputSchema>;

export async function analyzeImportedData(input: AnalyzeImportedDataInput): Promise<AnalyzeImportedDataOutput> {
  return analyzeImportedDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImportedDataPrompt',
  input: { schema: AnalyzeImportedDataInputSchema },
  output: { schema: AnalyzeImportedDataOutputSchema },
  prompt: `You are a data extraction expert. The text you receive has been pre-processed and contains only lines with lottery results.

  Your task is to process each line and extract the 20 drawn numbers. In each line, the numbers to be extracted are typically after the date field.

  Return a single, valid JSON object with a "results" key. The value of "results" must be an array of arrays, where each inner array contains the 20 numbers for one lottery contest.

  Example Input Snippet (pre-processed):
  "2846;07/11/202;42;33;25;97;68;13;12;76;92;16;73;74;28;67;60;41;93;14;53;39
  2845;05/11/202;53;69;86;44;39;75;30;81;90;73;96;31;58;37;54;21;85;83;68;16"

  Example Final JSON Output:
  {
    "results": [
      [42, 33, 25, 97, 68, 13, 12, 76, 92, 16, 73, 74, 28, 67, 60, 41, 93, 14, 53, 39],
      [53, 69, 86, 44, 39, 75, 30, 81, 90, 73, 96, 31, 58, 37, 54, 21, 85, 83, 68, 16]
    ]
  }

  If the input content is empty, return an empty array for "results".

  CRITICAL: You MUST return ONLY the JSON object and nothing else. No introductory text, no explanations, just the raw JSON.

  File Content to Parse:
  {{{fileContent}}}
  `,
});

const analyzeImportedDataFlow = ai.defineFlow(
  {
    name: 'analyzeImportedDataFlow',
    inputSchema: AnalyzeImportedDataInputSchema,
    outputSchema: AnalyzeImportedDataOutputSchema,
  },
  async input => {
    // Return early if the input is empty or just whitespace
    if (!input.fileContent || !input.fileContent.trim()) {
      return { results: [] };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
