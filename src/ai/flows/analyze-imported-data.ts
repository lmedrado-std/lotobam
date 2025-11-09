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
  fileContent: z.string().describe('The text content of the lottery results file.'),
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
  prompt: `You are a data extraction expert. Your task is to parse the provided text content, which comes from a lottery results file (CSV or TXT format).

  The file has header rows that should be ignored. The relevant data starts after a header row containing "Concurso", "Data", "bola 1", etc.

  For each valid row, you must extract the 20 drawn numbers (from "bola 1" to "bola 20"). Ignore the "Concurso" and "Data" columns.

  Return a single JSON object with a "results" key. The value of "results" should be an array of arrays, where each inner array contains the 20 numbers for one lottery contest.

  Example Input Snippet:
  ...
  Concurso;Data;bola 1;bola 2;...
  2846;07/11/2025;42;33;...
  2845;05/11/2025;53;69;...
  ...

  Example Output:
  {
    "results": [
      [42, 33, ...],
      [53, 69, ...]
    ]
  }

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
    const { output } = await prompt(input);
    return output!;
  }
);
