import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-bet-criteria.ts';
import '@/ai/flows/analyze-imported-data.ts';
import '@/ai/flows/include-criteria-with-export.ts';
import '@/ai/flows/suggest-bets-from-history.ts';
