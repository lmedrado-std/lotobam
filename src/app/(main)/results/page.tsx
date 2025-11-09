
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Upload, X, ExternalLink } from 'lucide-react';
import sampleData from '@/lib/sample-results.json';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';

type LottoResult = {
  concurso: number;
  data: string;
  numeros: number[];
};

const LOCAL_STORAGE_KEY = 'lotobam_imported_results';


/**
 * Parses the content of an Excel file (XLSX) and returns an array of lottery results.
 */
async function parseLotteryFile(file: File): Promise<LottoResult[]> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onerror = () => {
            reader.abort();
            reject(new Error("Não foi possível ler o arquivo."));
        };

        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                if (!data) {
                    resolve([]);
                    return;
                }
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const results: LottoResult[] = [];
                let headerFound = false;
                
                for (const row of json) {
                    if (!Array.isArray(row)) continue;

                    // Find the header row by looking for "Concurso"
                    if (!headerFound && String(row[0]).trim().toLowerCase() === 'concurso') {
                        headerFound = true;
                        continue; // Skip header row
                    }
                    
                    if (headerFound && row.length >= 22) {
                        const concurso = parseInt(String(row[0]), 10);
                        const data = String(row[1]); // Keep date as string
                        const numeros = row.slice(2, 22).map(n => parseInt(String(n), 10));
                        
                        if (!isNaN(concurso) && data && numeros.length === 20 && numeros.every(n => !isNaN(n) && n >= 0 && n <= 99)) {
                            results.push({ concurso, data, numeros });
                        }
                    }
                }
                resolve(results.sort((a, b) => b.concurso - a.concurso));
            } catch (e) {
                console.error("Erro ao processar o arquivo XLSX:", e);
                resolve([]); // Return empty array on parsing error
            }
        };

        reader.readAsArrayBuffer(file);
    });
}


export default function ResultsPage() {
  const { toast } = useToast();
  const [allResults, setAllResults] = useState<LottoResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<LottoResult[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState(true);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dataSource, setDataSource] = useState<'sample' | 'file'>('sample');

  useEffect(() => {
    // This effect runs only on the client-side
    setIsLoading(true);
    let initialResults: LottoResult[] = [];
    let initialDataSource: 'sample' | 'file' = 'sample';
    let toastMessage: { title: string, description: string } | null = null;

    try {
        const storedResults = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedResults) {
            const parsed = JSON.parse(storedResults);
            if (parsed.data && parsed.fileName) {
                initialResults = parsed.data;
                setImportedFileName(parsed.fileName);
                initialDataSource = 'file';
                toastMessage = {
                    title: 'Resultados Importados Carregados',
                    description: `Exibindo dados do arquivo "${parsed.fileName}".`,
                };
            }
        }
    } catch (error) {
        console.error("Failed to load results from localStorage", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    
    if (initialResults.length === 0) {
        initialResults = [...sampleData.results].sort((a, b) => b.concurso - a.concurso);
        initialDataSource = 'sample';
         // Only show toast for sample data if no stored data was found
         if (!toastMessage) {
            toastMessage = {
                title: 'Resultados de Exemplo Carregados',
                description: 'O histórico de concursos padrão foi carregado.',
            };
        }
    }

    updateResultsAndFilters(initialResults);
    setDataSource(initialDataSource);
    setIsLoading(false);
    if (toastMessage) {
        toast(toastMessage);
    }

  }, [toast]);

  const updateResultsAndFilters = (results: LottoResult[]) => {
      const sorted = results.sort((a,b) => b.concurso - a.concurso);
      setAllResults(sorted);
      setFilteredResults(sorted);

      const years = Array.from(new Set(sorted.map(r => r.data.split('/')[2]))).sort((a, b) => b.localeCompare(a));
      setAvailableYears(years);
      setSelectedYear('Todos');
  }

  const handleYearFilter = (year: string) => {
    setSelectedYear(year);
    if (year === 'Todos') {
      setFilteredResults(allResults);
    } else {
      setFilteredResults(allResults.filter(result => result.data.endsWith(year)));
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "Por favor, selecione um arquivo com menos de 5MB.",
        });
        return;
    }
    
    setIsLoading(true);
    toast({ title: "Processando arquivo...", description: "Lendo e validando os resultados da planilha." });

    const parsed = await parseLotteryFile(file);

    if (parsed.length === 0) {
        toast({
            variant: "destructive",
            title: "Arquivo Inválido ou Vazio",
            description: "Nenhum resultado válido foi encontrado. Verifique o formato do arquivo.",
        });
        setIsLoading(false);
        return;
    }

    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ fileName: file.name, data: parsed }));
    } catch (error) {
        console.error("Failed to save results to localStorage", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar Dados",
            description: "Não foi possível salvar os dados no armazenamento local. O arquivo pode ser muito grande.",
        });
    }

    updateResultsAndFilters(parsed);
    setImportedFileName(file.name);
    setDataSource('file');
    setIsLoading(false);
     toast({
        title: "Resultados Importados!",
        description: `${parsed.length} concursos foram carregados com sucesso do seu arquivo.`,
    });
  };

  const handleRemoveFile = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setImportedFileName(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    // Revert to sample data
    const sortedResults = [...sampleData.results].sort((a, b) => b.concurso - a.concurso);
    updateResultsAndFilters(sortedResults);
    setDataSource('sample');
    toast({ title: "Arquivo Removido", description: "Voltando a exibir os resultados de exemplo."});
  };
  
  const lastContest = allResults.length > 0 ? allResults[0].concurso : 'N/A';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Resultados da Loteria
        </h1>
        <p className="mt-2 text-muted-foreground">
          Importe e visualize o histórico de concursos.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Fonte de Dados dos Resultados</CardTitle>
           <CardDescription>
            Você pode usar nossa base de dados de exemplo ou importar sua própria planilha de resultados da Lotomania.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx"
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Planilha (.xlsx)
                  </Button>
                  <Button asChild>
                    <Link href="https://asloterias.com.br/download-todos-resultados-lotomania" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Acessar Site de Resultados
                    </Link>
                  </Button>
            </div>
             {dataSource === 'file' && importedFileName && (
                <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
                   <div className="flex items-center gap-2">
                     <span className="text-muted-foreground">Arquivo em uso:</span>
                     <span className="font-medium text-foreground truncate max-w-xs">{importedFileName}</span>
                   </div>
                   <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remover arquivo e usar dados de exemplo</span>
                   </Button>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Ano</CardTitle>
           <CardDescription>
            Navegue pelos resultados do ano desejado.
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
                  Exibindo {filteredResults.length} de {allResults.length} resultados. Último concurso: {lastContest}. Fonte: {dataSource === 'file' ? 'Arquivo Importado' : 'Dados de Exemplo'}
                </CardDescription>
              )}
            </div>
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
                          {result.numeros.sort((a,b) => a-b).map((num, index) => (
                            <Badge
                              key={`${result.concurso}-${num}-${index}`}
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
