export type Bet = number[];

export type Game = {
  id: string;
  owner: string;
  title: string;
  bets: Bet[];
  criteria: Record<string, any>;
  source: 'generated' | 'uploaded' | 'manual';
  templateId?: string;
  createdAt: number;
  tags?: string[];
  public?: boolean;
};

export type Template = {
  id: string;
  owner: string;
  name: string;
  criteria: Record<string, any>;
  createdAt: number;
};

export type Upload = {
  id: string;
  owner: string;
  filePath: string;
  status: 'pending' | 'processed' | 'error';
  resultsSummary?: {
    apostas: number;
    invalidLines: number;
  };
  createdAt: number;
};

export type HistoryEntry = {
    id: string;
    userId: string;
    type: 'generation' | 'import' | 'export' | 'template_creation';
    timestamp: number;
    details: Record<string, any>;
};
