'use server';

/**
 * @fileOverview A flow that includes the criteria used to generate bets when exporting them.
 *
 * - includeCriteriaWithExport - A function that handles the process of generating bets and including the criteria used.
 * - IncludeCriteriaWithExportInput - The input type for the includeCriteriaWithExport function.
 * - IncludeCriteriaWithExportOutput - The return type for the includeCriteriaWithExport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IncludeCriteriaWithExportInputSchema = z.object({
  criteria: z.record(z.any()).describe('The criteria used to generate the bets.'),
  bets: z.array(z.array(z.number())).describe('The generated bets (array of array of numbers).'),
});
export type IncludeCriteriaWithExportInput = z.infer<typeof IncludeCriteriaWithExportInputSchema>;

const IncludeCriteriaWithExportOutputSchema = z.object({
  exportedData: z.string().describe('A string containing the exported data with the criteria included.'),
});
export type IncludeCriteriaWithExportOutput = z.infer<typeof IncludeCriteriaWithExportOutputSchema>;

export async function includeCriteriaWithExport(input: IncludeCriteriaWithExportInput): Promise<IncludeCriteriaWithExportOutput> {
  return includeCriteriaWithExportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'includeCriteriaWithExportPrompt',
  input: {schema: IncludeCriteriaWithExportInputSchema},
  output: {schema: IncludeCriteriaWithExportOutputSchema},
  prompt: `Here are the bets:

{{#each bets}}
  {{this}}
{{/each}}

Here are the criteria used to generate the bets:

{{criteria}}

Return a string that includes the bets and the criteria.`,
});

const includeCriteriaWithExportFlow = ai.defineFlow(
  {
    name: 'includeCriteriaWithExportFlow',
    inputSchema: IncludeCriteriaWithExportInputSchema,
    outputSchema: IncludeCriteriaWithExportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {exportedData: output!.exportedData};
  }
);
