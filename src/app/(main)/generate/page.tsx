
'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Download, Sparkles, Trash2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import sampleData from '@/lib/sample-results.json';
import { suggestBetsFromHistory, type SuggestBetsFromHistoryOutput } from '@/ai/flows/suggest-bets-from-history';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';


const formSchema = z.object({
  dataSource: z.string({
    required_error: 'Por favor, selecione uma fonte de dados.',
  }),
  generationMode: z.string().optional(),
  quantity: z.coerce
    .number()
    .min(1, { message: 'A quantidade deve ser no mínimo 1.' })
    .max(100, { message: 'A quantidade não pode ser maior que 100.' }),
  manualNumbers: z.string().optional(),
  aiStrategy: z.string().optional(),
  numbersToInclude: z.string().optional(),
  numbersToAvoid: z.string().optional(),
}).refine(data => {
  if (data.dataSource === 'padrao' && (data.generationMode === 'completar_manual' || data.generationMode === 'excluir_numeros')) {
    return !!data.manualNumbers && data.manualNumbers.trim() !== '';
  }
  return true;
}, {
  message: 'Por favor, insira os números para esta operação.',
  path: ['manualNumbers'],
});

const templateFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome do modelo deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
});


type Bet = number[];

function parseManualNumbers(numbersStr: string | undefined): Set<number> {
  if (!numbersStr) return new Set();
  const numbers = numbersStr.split(/[\s,]+/).filter(Boolean).map(n => parseInt(n, 10));
  const validNumbers = numbers.filter(n => !isNaN(n) && n >= 0 && n <= 99);
  return new Set(validNumbers);
}

// Custom sort function to place 0 at the end
function lottoSort(a: number, b: number): number {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return a - b;
}


function generateBet(mode: string, exclusionSet: Set<number> = new Set()): Bet {
  let bet: Set<number> = new Set();
  
  if (mode === 'completar_manual') {
    bet = new Set(exclusionSet); // Start with the fixed numbers
    exclusionSet = new Set(); // Don't exclude them from the random part
  }
  
  while (bet.size < 50) {
    const randomNumber = Math.floor(Math.random() * 100); // 0-99
    if (!bet.has(randomNumber) && !exclusionSet.has(randomNumber)) {
      bet.add(randomNumber);
    }
  }
  return Array.from(bet).sort(lottoSort);
}

/**
 * Recebe o conteúdo de um arquivo Excel e retorna um array de arrays com os 20 números sorteados de cada linha válida.
 */
async function parseLotteryFile(file: File): Promise<number[][]> {
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

                const results: number[][] = [];
                // Começa a partir da segunda linha para ignorar o cabeçalho
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    // Pega os 20 números das colunas C até V (índices 2 a 21)
                    if (row.length >= 22) {
                        const contestNumbers = row.slice(2, 22).map(n => parseInt(String(n), 10));
                        if (contestNumbers.length === 20 && contestNumbers.every(n => !isNaN(n) && n >= 0 && n <= 99)) {
                            results.push(contestNumbers);
                        }
                    }
                }
                resolve(results);
            } catch (e) {
                console.error("Erro ao processar o arquivo XLSX:", e);
                resolve([]); // Retorna array vazio em caso de erro de parsing
            }
        };

        reader.readAsArrayBuffer(file);
    });
}



// Helper to format bets into a string
const formatBets = (bets: Bet[], format: 'csv'): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const header = Array.from({ length: 50 }, (_, i) => `num${i + 1}`).join(',');
  const rows = bets.map(bet => bet.map(pad).join(','));
  return `id,${header}\n${rows.map((row, i) => `${i + 1},${row}`).join('\n')}`;
};

// Helper to trigger file download
const downloadFile = (content: string, fileName: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const LottoGrid = ({ bet }: { bet: Bet }) => {
  const finalGrid = Array.from({ length: 100 }, (_, i) => i).sort((a,b) => {
      if(a === 0) return 1;
      if(b === 0) return -1;
      return a - b;
  });
  if(!finalGrid.includes(0)) finalGrid.push(0);

  const betSet = new Set(bet);

  return (
    <div className="grid grid-cols-10 gap-1 p-2 rounded-md border bg-card-foreground/5 max-w-sm">
      {finalGrid.slice(0,100).map((num, i) => {
        const isSelected = betSet.has(num);
        return (
          <div
            key={i}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground'
            )}
          >
            {num.toString().padStart(2, '0')}
          </div>
        );
      })}
    </div>
  );
};


const getNumberStats = (results: number[][]) => {
    const frequency: { [key: number]: number } = {};
    for (let i = 0; i <= 99; i++) {
        frequency[i] = 0;
    }

    results.forEach(contestNumbers => {
        contestNumbers.forEach(num => {
            if (frequency[num] !== undefined) {
                frequency[num]++;
            }
        });
    });

    const sortedNumbers = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    const hotNumbers = sortedNumbers.slice(0, 20).map(item => parseInt(item[0]));
    const coldNumbers = sortedNumbers.slice(-20).map(item => parseInt(item[0]));

    return { hotNumbers, coldNumbers };
};

const generationModeDescriptions: Record<string, string> = {
  aleatorio: 'Gera apostas com 50 números selecionados de forma totalmente aleatória entre 00 e 99.',
  completar_manual: 'Você fixa alguns números e o sistema completa o restante aleatoriamente até atingir 50 números.',
  excluir_numeros: 'Você informa números que não devem aparecer em nenhuma das apostas geradas.',
};

const dataSourceDescriptions: Record<string, string> = {
    padrao: 'Gere apostas usando métodos simples como aleatório puro, completar ou excluir números manualmente.',
    historico: 'A IA analisa nosso histórico de concursos para sugerir apostas com base em estratégias de números quentes, frios ou um mix.',
    arquivo: 'Faça upload de um arquivo de resultados (CSV/TXT/XLSX). A IA irá analisá-lo e gerar novas apostas com base na estratégia que você escolher.'
}


export default function GeneratePage() {
  const [generatedBets, setGeneratedBets] = useState<Bet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { firestore, user, isUserLoading } = useFirebase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 10,
      dataSource: 'arquivo',
      generationMode: 'aleatorio',
      manualNumbers: '',
      aiStrategy: 'balanced',
      numbersToInclude: '',
      numbersToAvoid: ''
    },
  });
  
  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const selectedDataSource = useWatch({
    control: form.control,
    name: 'dataSource',
  });

  const selectedGenerationMode = useWatch({
      control: form.control,
      name: 'generationMode'
  });

  const callAiSuggestBets = async (
    stats: { hotNumbers: number[]; coldNumbers: number[] },
    quantity: number,
    strategy: string,
    inclusionList: number[],
    exclusionList: number[]
  ): Promise<Bet[]> => {
  
    // Single call to the AI
    const response = await suggestBetsFromHistory({
      stats,
      strategy: strategy,
      numberOfBets: quantity,
      manualInclusion: inclusionList,
      manualExclusion: exclusionList,
    });
  
    if (!response || !response.suggestions) {
      throw new Error("A IA retornou uma resposta inválida. Tente novamente.");
    }
    
    // The AI should already handle uniqueness, but we can double check here if needed.
    // For now, we trust the AI's output as the loop was causing rate-limiting.
    const newUniqueSuggestions = response.suggestions;
  
    if (newUniqueSuggestions.length < quantity) {
      toast({
        variant: 'default',
        title: 'Atenção: Menos jogos gerados que o solicitado',
        description: `A IA conseguiu criar ${newUniqueSuggestions.length} jogos únicos com os critérios fornecidos.`,
      });
    }
  
    return newUniqueSuggestions.slice(0, quantity).map(bet => bet.sort(lottoSort));
  };


  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedBets([]);

    try {
        const inclusionList = Array.from(parseManualNumbers(data.numbersToInclude));
        const exclusionList = Array.from(parseManualNumbers(data.numbersToAvoid));

        if (inclusionList.length >= 50) {
            toast({
                variant: 'destructive',
                title: 'Muitos números para incluir',
                description: 'Você especificou 50 ou mais números para incluir. A aposta será apenas esses números.',
            });
            setGeneratedBets([inclusionList.slice(0, 50).sort(lottoSort)]);
            setIsGenerating(false);
            return;
        }


        if (data.dataSource === 'historico') {
            toast({ title: 'A IA está pensando...', description: 'Analisando o histórico de concursos para criar as melhores apostas.' });
            const historyResults = sampleData.results.map(r => r.numeros);
            const stats = getNumberStats(historyResults);
            
            const bets = await callAiSuggestBets(stats, data.quantity, data.aiStrategy || 'balanced', inclusionList, exclusionList);
            setGeneratedBets(bets);

        } else if (data.dataSource === 'arquivo') {
            if (!selectedFile) {
                toast({
                    variant: "destructive",
                    title: "Nenhum arquivo selecionado",
                    description: "Por favor, selecione um arquivo para usar como base.",
                });
                setIsGenerating(false);
                return;
            }
            toast({ title: 'Lendo seu arquivo...', description: 'Extraindo os números para análise.' });
            
            const parsedResult = await parseLotteryFile(selectedFile);

            if (parsedResult.length === 0) {
                 toast({
                    variant: "destructive",
                    title: "Arquivo Inválido ou Vazio",
                    description: "Nenhum número de aposta ou resultado válido foi encontrado. Verifique se o arquivo segue o padrão: concurso;data;20 dezenas.",
                });
                setIsGenerating(false);
                return;
            }

            toast({ title: 'Analisando e gerando apostas...', description: `Usando a estratégia "${data.aiStrategy}" com base nos dados do arquivo.` });
            const stats = getNumberStats(parsedResult);
            
            const bets = await callAiSuggestBets(stats, data.quantity, data.aiStrategy || 'balanced', inclusionList, exclusionList);
            setGeneratedBets(bets);
            if(bets.length > 0) {
              toast({ title: 'Apostas geradas com base no arquivo!', description: `Análise concluída. ${bets.length} novas apostas foram criadas.` });
            }

        } else { // Standard Modes
            let bets: Bet[] = [];
            let initialSet = parseManualNumbers(data.manualNumbers);

            if (data.generationMode === 'completar_manual') {
                if (initialSet.size >= 50) {
                    toast({ variant: "destructive", title: "Muitos números inseridos", description: "Você inseriu 50 ou mais números. Não é necessário completar." });
                    bets = [Array.from(initialSet).slice(0, 50).sort(lottoSort)];
                } else {
                    bets = Array.from({ length: data.quantity }, () => generateBet('completar_manual', initialSet));
                }
            } else if (data.generationMode === 'excluir_numeros') {
                if (initialSet.size > 50) {
                    toast({
                      variant: "destructive",
                      title: "Erro de Lógica",
                      description: "Você não pode excluir mais de 50 números, pois é impossível gerar uma aposta.",
                    });
                    setIsGenerating(false);
                    return;
                }
                bets = Array.from({ length: data.quantity }, () => generateBet('aleatorio', initialSet));
            } else { // aleatorio
                bets = Array.from({ length: data.quantity }, () => generateBet('aleatorio'));
            }
            setGeneratedBets(bets);
        }
    } catch (error: any) {
        console.error("Bet generation failed:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Gerar Apostas",
            description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        });
    } finally {
        setIsGenerating(false);
    }
  }

  function handleClear() {
    setGeneratedBets([]);
  }

  function handleExport() {
    if (generatedBets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma aposta para exportar',
        description: 'Gere algumas apostas antes de exportar.',
      });
      return;
    }
    
    const fileContent = formatBets(generatedBets, 'csv');
    downloadFile(fileContent, `lotobam-apostas.csv`, 'text/csv;charset=utf-8;');

    toast({
      title: 'Exportação Concluída',
      description: `Seu arquivo .csv foi baixado.`,
    });
  }

  async function handleSaveTemplate(values: z.infer<typeof templateFormSchema>) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Usuário não autenticado",
        description: "Você precisa estar logado para salvar um modelo.",
      });
      return;
    }

    const generationCriteria = form.getValues();
    
    try {
      const templatesCollection = collection(firestore, `users/${user.uid}/templates`);
      await addDoc(templatesCollection, {
        ownerId: user.uid,
        name: values.name,
        description: values.description,
        criteria: generationCriteria,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Modelo salvo!',
        description: `O modelo "${values.name}" foi salvo com sucesso.`,
      });

      setSaveTemplateModalOpen(false);
      templateForm.reset();

    } catch (error) {
      console.error("Error saving template: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar o modelo. Tente novamente mais tarde.",
      });
    }
  }
  
  const handleOpenSaveModal = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Faça login para salvar",
        description: "Apenas usuários autenticados podem salvar modelos.",
      });
      return;
    }
    setSaveTemplateModalOpen(true);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "Por favor, selecione um arquivo com menos de 5MB.",
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getManualNumbersLabel = () => {
    switch (selectedGenerationMode) {
      case 'completar_manual':
        return 'Números para Fixar';
      case 'excluir_numeros':
        return 'Números para Excluir';
      default:
        return '';
    }
  };

  const getManualNumbersDescription = () => {
    switch (selectedGenerationMode) {
      case 'completar_manual':
        return 'O sistema usará esses números e gerará o restante aleatoriamente até completar 50.';
      case 'excluir_numeros':
        return 'Os números inseridos aqui não aparecerão em nenhuma das apostas geradas.';
      default:
        return '';
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Gerar Apostas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Crie ou importe apostas usando critérios avançados.
        </p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Critérios de Geração</CardTitle>
              <CardDescription>
                Defina a fonte de dados e os critérios para criar suas apostas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="dataSource"
                render={({ field }) => (
                  <FormItem className="lg:col-span-1">
                    <FormLabel>Fonte de Dados</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma fonte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="arquivo">Arquivo Local (IA)</SelectItem>
                        <SelectItem value="historico">Histórico de Concursos (IA)</SelectItem>
                        <SelectItem value="padrao">Padrão (Simples)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                       {dataSourceDescriptions[selectedDataSource] || 'Escolha como suas apostas serão geradas.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="lg:col-span-1">
                    <FormLabel>Quantidade de Apostas</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 10" {...field} />
                    </FormControl>
                    <FormDescription>
                      Quantas apostas você deseja gerar (máx: 100).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Standard Generation Mode */}
              {selectedDataSource === 'padrao' && (
                <FormField
                  control={form.control}
                  name="generationMode"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-1">
                      <FormLabel>Modo de Geração</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um modo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aleatorio">Aleatório Puro</SelectItem>
                          <SelectItem value="completar_manual">Completar Números</SelectItem>
                          <SelectItem value="excluir_numeros">Excluir Números</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {generationModeDescriptions[selectedGenerationMode || ''] || 'Selecione um modo para ver a descrição.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Manual numbers for standard modes */}
              {selectedDataSource === 'padrao' && (selectedGenerationMode === 'completar_manual' || selectedGenerationMode === 'excluir_numeros') && (
                 <FormField
                  control={form.control}
                  name="manualNumbers"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-3">
                      <FormLabel>{getManualNumbersLabel()}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite os números separados por espaço ou vírgula. Ex: 5 12 23 45 88"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {getManualNumbersDescription()}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* AI Strategy */}
              {(selectedDataSource === 'historico' || selectedDataSource === 'arquivo') && (
                <FormField
                  control={form.control}
                  name="aiStrategy"
                  render={({ field }) => (
                    <FormItem className="space-y-3 lg:col-span-3">
                      <FormLabel>Estratégia da IA</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="hot" /></FormControl>
                            <FormLabel className="font-normal">Números Quentes (Mais Frequentes)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="cold" /></FormControl>
                            <FormLabel className="font-normal">Números Frios (Menos Frequentes)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="balanced" /></FormControl>
                            <FormLabel className="font-normal">Balanceado (Mix de Estratégias)</FormLabel>
                          </FormItem>
                           <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="unseen" /></FormControl>
                            <FormLabel className="font-normal">Surpresa (Foco em números 'esquecidos')</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="unseen_bets" /></FormControl>
                            <FormLabel className="font-normal">Evitar Cópias (Gerar jogos 100% novos)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        A IA usará a fonte de dados escolhida para seguir a estratégia.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* File Upload */}
              {selectedDataSource === 'arquivo' && (
                <div className="space-y-4 lg:col-span-3">
                    <FormLabel>Arquivo de Origem</FormLabel>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".csv, .txt, .xlsx"
                        />
                        <Button type="button" variant="outline" onClick={handleUploadClick} className="w-full sm:w-auto">
                          <Upload className="mr-2 h-4 w-4" />
                          Localizar Arquivo
                        </Button>
                        {selectedFile && (
                          <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
                             <span className="text-muted-foreground">Arquivo:</span>
                             <span className="ml-2 font-medium text-foreground truncate max-w-xs">{selectedFile.name}</span>
                             <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="ml-2 h-6 w-6">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remover arquivo</span>
                             </Button>
                          </div>
                        )}
                      </div>
                </div>
              )}
              
              {/* Numbers to Include (for AI) */}
              {(selectedDataSource === 'historico' || selectedDataSource === 'arquivo') && (
                 <FormField
                  control={form.control}
                  name="numbersToInclude"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-3">
                      <FormLabel>Números para Incluir (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite números para a IA fixar. Ex: 10 20 30"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A IA irá incluir estes números em todas as apostas geradas e completará o restante.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Numbers to Avoid (for AI) */}
              {(selectedDataSource === 'historico' || selectedDataSource === 'arquivo') && (
                 <FormField
                  control={form.control}
                  name="numbersToAvoid"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-3">
                      <FormLabel>Números para Evitar (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite números para a IA ignorar. Ex: 7 15 33"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A IA não usará esses números ao gerar as apostas, mesmo que sejam estatisticamente relevantes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isGenerating} className="w-full md:w-auto">
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? 'Gerando...' : 'Gerar Apostas'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {generatedBets.length > 0 && (
         <Card>
           <CardHeader>
             <div className="flex flex-wrap items-center justify-between gap-4">
               <div>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>
                  {generatedBets.length} apostas geradas com sucesso.
                </CardDescription>
               </div>
               <div className="flex flex-wrap gap-2">
                 <Button variant="outline" onClick={handleOpenSaveModal} disabled={isUserLoading}>
                   <Bookmark className="mr-2 h-4 w-4"/> Salvar como Modelo
                 </Button>
                  <Button onClick={handleExport}>
                    <FileSpreadsheet className="mr-2 h-4 w-4"/> Exportar para CSV
                  </Button>
                 <Button variant="ghost" size="icon" onClick={handleClear} title="Limpar apostas geradas">
                   <Trash2 className="h-4 w-4"/>
                   <span className="sr-only">Limpar</span>
                 </Button>
               </div>
             </div>
           </CardHeader>
           <CardContent>
             <div className="relative max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-[80px]">Aposta</TableHead>
                    <TableHead>Números</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedBets.map((bet, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium align-top">#{index + 1}</TableCell>
                      <TableCell>
                        <LottoGrid bet={bet} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
             </div>
           </CardContent>
         </Card>
       )}

      {/* Save Template Modal */}
      <Dialog open={isSaveTemplateModalOpen} onOpenChange={setSaveTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Modelo de Geração</DialogTitle>
            <DialogDescription>
              Dê um nome e uma descrição para reutilizar essa configuração de critérios mais tarde.
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form 
              onSubmit={templateForm.handleSubmit(handleSaveTemplate)} 
              className="space-y-4 py-4"
            >
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Balanceado com números da sorte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Modelo para bolões em família" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Salvar Modelo</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    

    
