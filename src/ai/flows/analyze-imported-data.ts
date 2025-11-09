
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

  The file may contain header rows, titles, or empty lines that should be completely ignored. The relevant data rows are the ones that contain the lottery numbers.

  For each valid row containing lottery numbers, you must extract all 20 drawn numbers (from "bola 1" to "bola 20"). Ignore all other columns like "Concurso" and "Data".

  Return a single, valid JSON object with a "results" key. The value of "results" must be an array of arrays, where each inner array contains the 20 numbers for one lottery contest. Do not include any text or explanations outside of the JSON object.

  Example Input Snippet:
  "As Loterias - www.asloterias.com.br - Todos Resultados da Loto Mania
  Este arquivo foi baixado no site www.asloterias.com.br no dia 09/11/2025
  TODOS RESULTADOS DA LOTO MANIA POR ORDEM DE SORTEIO
  Concurso;Data;bola 1;bola 2;...;bola 20
  2846;07/11/202;42;33;...;39
  2845;05/11/202;53;69;...;16
  "

  Example of a valid row to parse from the snippet:
  "2846;07/11/202;42;33;25;97;68;13;12;76;92;16;73;74;28;67;60;41;93;14;53;39"

  Correctly Extracted Numbers from that row (the 20 numbers after the date):
  [42, 33, 25, 97, 68, 13, 12, 76, 92, 16, 73, 74, 28, 67, 60, 41, 93, 14, 53, 39]

  Example Final JSON Output:
  {
    "results": [
      [42, 33, 25, 97, 68, 13, 12, 76, 92, 16, 73, 74, 28, 67, 60, 41, 93, 14, 53, 39],
      [53, 69, 86, 44, 39, 75, 30, 81, 90, 73, 96, 31, 58, 37, 54, 21, 85, 83, 68, 16]
    ]
  }

  If the file is empty or contains no valid number rows, return an empty array for "results".

  CRITICAL: You must return ONLY the JSON object and nothing else.

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



