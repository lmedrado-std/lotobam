
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
  fileContent: z.string().describe('The raw text content of the lottery results file.'),
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
  prompt: `You are a data extraction expert specializing in Brazilian lottery files. Your task is to parse the provided text content and extract only the drawn numbers from each valid result line.

  A valid result line contains the contest number, the date, and then the 20 drawn numbers, typically separated by semicolons.

  Your task:
  1.  Process the entire text content you receive.
  2.  For each line that represents a lottery result, extract the 20 drawn numbers. These are the numbers that appear AFTER the date.
  3.  Ignore all other lines, including headers (like "Concurso;Data;bola 1;..."), empty lines, or any other text.
  4.  Return a single, valid JSON object with a "results" key. The value of "results" must be an array of arrays, where each inner array contains the 20 numbers for one lottery contest.

  Example Input Snippet:
  "2846;07/11/202;42;33;25;97;68;13;12;76;92;16;73;74;28;67;60;41;93;14;53;39
  2845;05/11/202;53;69;86;44;39;75;30;81;90;73;96;31;58;37;54;21;85;83;68;16"

  Example Final JSON Output for the snippet above:
  {
    "results": [
      [42, 33, 25, 97, 68, 13, 12, 76, 92, 16, 73, 74, 28, 67, 60, 41, 93, 14, 53, 39],
      [53, 69, 86, 44, 39, 75, 30, 81, 90, 73, 96, 31, 58, 37, 54, 21, 85, 83, 68, 16]
    ]
  }

  If the input content has no valid result lines, return an empty array for "results".

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

    