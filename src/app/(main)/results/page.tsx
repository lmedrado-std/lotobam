'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw } from 'lucide-react';
import sampleData from '@/lib/sample-results.json';

type LottoResult = {
  concurso: number;
  data: string;
  numeros: number[];
};

export default function ResultsPage() {
  const { toast } = useToast();
  const [results, setResults] = useState<LottoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load results on component mount
  useEffect(() => {
    handleUpdateResults();
  }, []);

  const handleUpdateResults = () => {
    setIsLoading(true);
    // Simulates a network request to fetch results
    setTimeout(() => {
      setResults(sampleData.results);
      setIsLoading(false);
      toast({
        title: 'Resultados Carregados',
        description: 'O histórico de concursos foi carregado.',
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Resultados da Lotomania
        </h1>
        <p className="mt-2 text-muted-foreground">
          Veja os últimos resultados e atualize a base de dados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Histórico de Concursos</CardTitle>
              <CardDescription>
                Visualize os resultados dos sorteios anteriores.
              </CardDescription>
            </div>
            <Button onClick={handleUpdateResults} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Atualizando...' : 'Atualizar Resultados'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="relative max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-[120px]">Concurso</TableHead>
                    <TableHead className="w-[150px]">Data</TableHead>
                    <TableHead>Números Sorteados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.concurso}>
                      <TableCell className="font-medium">
                        {result.concurso}
                      </TableCell>
                      <TableCell>{result.data}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {result.numeros.map((num) => (
                            <Badge
                              key={num}
                              variant="secondary"
                              className="flex h-6 w-6 items-center justify-center text-xs"
                            >
                              {num.toString().padStart(2, '0')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
               {isLoading ? (
                 <p className="text-muted-foreground">Carregando resultados...</p>
               ) : (
                 <p className="text-muted-foreground">
                   Nenhum resultado para exibir. Clique em "Atualizar Resultados".
                 </p>
               )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
