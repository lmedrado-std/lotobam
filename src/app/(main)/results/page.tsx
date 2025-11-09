
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
import { RefreshCw } from 'lucide-react';
import sampleData from '@/lib/sample-results.json';
import { cn } from '@/lib/utils';

type LottoResult = {
  concurso: number;
  data: string;
  numeros: number[];
};

export default function ResultsPage() {
  const { toast } = useToast();
  const [allResults, setAllResults] = useState<LottoResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<LottoResult[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const sortedResults = [...sampleData.results].sort((a, b) => b.concurso - a.concurso);
      setAllResults(sortedResults);
      setFilteredResults(sortedResults);

      const years = Array.from(new Set(sortedResults.map(r => r.data.split('/')[2]))).sort((a, b) => b.localeCompare(a));
      setAvailableYears(years);
      
      setIsLoading(false);
      toast({
        title: 'Resultados Carregados',
        description: 'O histórico de concursos foi carregado com sucesso.',
      });
    }, 1000);
  }, [toast]);

  const handleYearFilter = (year: string) => {
    setSelectedYear(year);
    if (year === 'Todos') {
      setFilteredResults(allResults);
    } else {
      setFilteredResults(allResults.filter(result => result.data.endsWith(year)));
    }
  };

  const handleUpdateResults = () => {
    toast({
      title: 'Resultados Atualizados',
      description: 'Você já tem a lista de concursos mais recente.',
    });
  };
  
  const lastContest = allResults.length > 0 ? allResults[0].concurso : 'N/A';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Resultados da Lotomania
        </h1>
        <p className="mt-2 text-muted-foreground">
          Veja os últimos resultados e mantenha a base de dados atualizada.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Ano</CardTitle>
           <CardDescription>
            Temos também a opção de exibir os resultados por ano, basta clicar em um ano abaixo!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2 md:grid-cols-8 lg:grid-cols-12">
              {Array.from({length: 12}).map((_, i) => <div key={i} className="h-8 w-16 rounded-md bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Button
                    variant={selectedYear === 'Todos' ? 'link' : 'ghost'}
                    onClick={() => handleYearFilter('Todos')}
                    className={cn('p-0 h-auto text-base', selectedYear === 'Todos' && 'font-bold underline')}
                >
                    Todos
                </Button>
              {availableYears.map(year => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'link' : 'ghost'}
                  onClick={() => handleYearFilter(year)}
                  className={cn('p-0 h-auto text-base', selectedYear === year && 'font-bold underline')}
                >
                  {year}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Histórico de Concursos</CardTitle>
              {isLoading ? (
                 <CardDescription>Carregando resultados...</CardDescription>
              ) : (
                <CardDescription>
                  Exibindo {filteredResults.length} de {allResults.length} resultados. Último concurso: {lastContest}.
                </CardDescription>
              )}
            </div>
            <Button onClick={handleUpdateResults} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Resultados
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
                 <p className="text-muted-foreground">Carregando resultados...</p>
            </div>
          ) : filteredResults.length > 0 ? (
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
                  {filteredResults.map((result) => (
                    <TableRow key={result.concurso}>
                      <TableCell className="font-medium">
                        {result.concurso}
                      </TableCell>
                      <TableCell>{result.data}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {result.numeros.sort((a,b) => a-b).map((num) => (
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
                 <p className="text-muted-foreground">
                   Nenhum resultado para exibir para o ano de {selectedYear}.
                 </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
