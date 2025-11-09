
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
import { Bookmark, Download, Sparkles, Trash2, FileText, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { suggestBetsFromHistory } from '@/ai/flows/suggest-bets-from-history';
import { cn } from '@/lib/utils';


const formSchema = z.object({
  mode: z.string({
    required_error: 'Por favor, selecione um modo de geração.',
  }),
  quantity: z.coerce
    .number()
    .min(1, { message: 'A quantidade deve ser no mínimo 1.' })
    .max(100, { message: 'A quantidade não pode ser maior que 100.' }),
  manualNumbers: z.string().optional(),
  aiStrategy: z.string().optional(),
  avoidanceBase: z.string().optional(),
}).refine(data => {
  if (data.mode === 'completar_manual' || data.mode === 'excluir_numeros') {
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

const fileImportSchema = z.object({
  aiFileStrategy: z.string(),
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
  
  // Specific logic for 'completar_manual' which is handled in onSubmit
  if (mode === 'completar_manual') {
     // This mode's primary logic is handled before calling generateBet.
     // This function, for this mode, just fills up the remainder.
  }

  while (bet.size < 50) {
    const randomNumber = Math.floor(Math.random() * 100); // 0-99
    if (!bet.has(randomNumber) && !exclusionSet.has(randomNumber)) {
      bet.add(randomNumber);
    }
  }
  return Array.from(bet).sort(lottoSort);
}


// Helper to format bets into a string
const formatBets = (bets: Bet[], format: 'csv' | 'json' | 'txt'): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (format === 'json') {
    return JSON.stringify(bets.map((bet, i) => ({ id: i + 1, numbers: bet })), null, 2);
  }
  
  if (format === 'csv') {
    const header = Array.from({ length: 50 }, (_, i) => `num${i + 1}`).join(',');
    const rows = bets.map(bet => bet.map(pad).join(','));
    return `id,${header}\n${rows.map((row, i) => `${i + 1},${row}`).join('\n')}`;
  }

  // txt format
  return bets.map(bet => bet.map(pad).join(' ')).join('\n');
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
  const numbersGrid = Array.from({ length: 10 }, (_, rowIndex) =>
    Array.from({ length: 10 }, (_, colIndex) => {
      let num = rowIndex * 10 + colIndex;
      if(rowIndex === 0 && colIndex === 0) num = 0
      else if (colIndex === 0) num = (rowIndex * 10)
      
      const n = rowIndex * 10 + colIndex + 1;
      if (n > 100) return 0;
      if (n === 100) return 0;
      return n;
    })
  );

  const finalGrid = Array.from({ length: 100 }, (_, i) => i).sort((a,b) => {
      if(a === 0) return 1;
      if(b === 0) return -1;
      return a - b;
  });
  finalGrid.push(0);

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

const getNumberStats = (data: any[]) => {
    const frequency: { [key: number]: number } = {};
    for (let i = 0; i <= 99; i++) {
        frequency[i] = 0;
    }

    data.forEach(result => {
        result.numeros.forEach((num: number) => {
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

const getNumberStatsFromFileContent = (content: string) => {
    const numbers = content.match(/\d+/g)?.map(Number) || [];
    const frequency: { [key: number]: number } = {};
    for (let i = 0; i <= 99; i++) {
        frequency[i] = 0;
    }

    numbers.forEach(num => {
        if (frequency[num] !== undefined) {
            frequency[num]++;
        }
    });

    const sortedNumbers = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    const hotNumbers = sortedNumbers.slice(0, 20).map(item => parseInt(item[0]));
    const coldNumbers = sortedNumbers.slice(-20).map(item => parseInt(item[0]));

    return { hotNumbers, coldNumbers };
};


export default function GeneratePage() {
  const [generatedBets, setGeneratedBets] = useState<Bet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { firestore, user, isUserLoading } = useFirebase();
  const [resultsHistory, setResultsHistory] = useState<any[]>([]);

  useEffect(() => {
    // Load results on component mount
    setResultsHistory(sampleData.results);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 10,
      mode: 'aleatorio',
      manualNumbers: '',
      aiStrategy: 'balanced',
      avoidanceBase: 'historico',
    },
  });
  
  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const fileImportForm = useForm<z.infer<typeof fileImportSchema>>({
    resolver: zodResolver(fileImportSchema),
    defaultValues: {
      aiFileStrategy: 'balanced',
    },
  });

  const selectedMode = useWatch({
    control: form.control,
    name: 'mode',
  });

  const generateBetsWithFile = async () => {
    if (!selectedFile) {
        toast({
            variant: 'destructive',
            title: 'Nenhum arquivo selecionado',
            description: 'Por favor, localize um arquivo para usar como base.',
        });
        return;
    }

    setIsGenerating(true);
    setGeneratedBets([]);

    try {
        const fileContent = await selectedFile.text();
        const { quantity } = form.getValues();
        const { aiFileStrategy } = fileImportForm.getValues();
        const stats = getNumberStatsFromFileContent(fileContent);

        toast({
          title: 'A IA está analisando seu arquivo...',
          description: `Usando a estratégia "${aiFileStrategy}" para gerar as apostas.`,
        });

        const response = await suggestBetsFromHistory({
            stats,
            strategy: aiFileStrategy,
            numberOfBets: quantity,
        });

        setGeneratedBets(response.suggestions.map(bet => bet.sort(lottoSort)));
        toast({
          title: 'Apostas geradas com base no arquivo!',
          description: response.analysis,
        })
    } catch (error) {
        console.error("File-based AI generation failed:", error);
        toast({
            variant: "destructive",
            title: "Erro ao ler arquivo ou gerar apostas",
            description: "Verifique o formato do arquivo ou tente novamente.",
        });
    } finally {
        setIsGenerating(false);
    }
  };


  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedBets([]);

    if (data.mode === 'ai_strategy') {
      try {
        toast({
          title: 'A IA está pensando...',
          description: 'Analisando o histórico de resultados para criar as melhores apostas.',
        });
        
        const stats = getNumberStats(resultsHistory);

        const response = await suggestBetsFromHistory({
          stats,
          strategy: data.aiStrategy || 'balanced',
          numberOfBets: data.quantity,
        });
        setGeneratedBets(response.suggestions.map(bet => bet.sort(lottoSort)));
      } catch (error) {
        console.error("AI generation failed:", error);
        toast({
          variant: "destructive",
          title: "Erro da IA",
          description: "Não foi possível gerar apostas com a IA. Tente novamente.",
        });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    let exclusionSet = new Set<number>();
    
    if (data.mode === 'evitar_base') {
      if (data.avoidanceBase === 'historico') {
        const numbersFromHistory = resultsHistory.flatMap(result => result.numeros);
        exclusionSet = new Set(numbersFromHistory);
      } else if (data.avoidanceBase === 'arquivo') {
        if (!selectedFile) {
          toast({
            variant: "destructive",
            title: "Nenhum arquivo selecionado",
            description: "Por favor, selecione um arquivo para usar como base de exclusão.",
          });
          setIsGenerating(false);
          return;
        }
        try {
          const fileContent = await selectedFile.text();
          exclusionSet = parseManualNumbers(fileContent);
        } catch (e) {
          toast({
            variant: "destructive",
            title: "Erro ao ler o arquivo",
            description: "Não foi possível processar os números do arquivo.",
          });
          setIsGenerating(false);
          return;
        }
      }
    } else {
        exclusionSet = parseManualNumbers(data.manualNumbers);
    }

    if (data.mode === 'completar_manual') {
      if (exclusionSet.size >= 50) {
        toast({
          variant: "destructive",
          title: "Muitos números inseridos",
          description: "Você inseriu 50 ou mais números. Não é necessário completar.",
        });
        const singleBet = Array.from(exclusionSet).slice(0, 50).sort(lottoSort);
        setGeneratedBets([singleBet]);
        setIsGenerating(false);
        return;
      }
      
      const completedBets = Array.from({ length: data.quantity }, () => {
        let bet = new Set(exclusionSet);
        while (bet.size < 50) {
          const randomNumber = Math.floor(Math.random() * 100);
          if (!bet.has(randomNumber)) {
            bet.add(randomNumber);
          }
        }
        return Array.from(bet).sort(lottoSort);
      });
      setGeneratedBets(completedBets);
      setIsGenerating(false);
      return;
    }
    
    if ((data.mode === 'excluir_numeros' || data.mode === 'evitar_base') && exclusionSet.size > 50) {
      toast({
        variant: "destructive",
        title: "Muitos números para excluir",
        description: "Você não pode excluir mais de 50 números, pois é impossível gerar uma aposta.",
      });
      setIsGenerating(false);
      return;
    }

    // Simulating generation delay for non-AI modes
    setTimeout(() => {
      const modeForGeneration = (data.mode === 'completar_manual') ? 'aleatorio' : data.mode;
      const finalExclusionSet = (data.mode === 'excluir_numeros' || data.mode === 'evitar_base') ? exclusionSet : new Set();
      const bets = Array.from({ length: data.quantity }, () => generateBet(modeForGeneration, finalExclusionSet));
      setGeneratedBets(bets);
      setIsGenerating(false);
    }, 500);
  }

  function handleClear() {
    setGeneratedBets([]);
  }

  function handleExport(format: 'csv' | 'json' | 'txt') {
    if (generatedBets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma aposta para exportar',
        description: 'Gere algumas apostas antes de exportar.',
      });
      return;
    }
    
    const fileMap = {
      csv: { extension: 'csv', contentType: 'text/csv;charset=utf-8;' },
      json: { extension: 'json', contentType: 'application/json' },
      txt: { extension: 'txt', contentType: 'text/plain' },
    };

    const { extension, contentType } = fileMap[format];
    const fileContent = formatBets(generatedBets, format);
    downloadFile(fileContent, `lotomania-apostas-${Date.now()}.${extension}`, contentType);

    toast({
      title: 'Exportação Concluída',
      description: `Seu arquivo foi baixado com sucesso.`,
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getManualNumbersLabel = () => {
    switch (selectedMode) {
      case 'completar_manual':
        return 'Números para Fixar';
      case 'excluir_numeros':
        return 'Números para Excluir';
      default:
        return '';
    }
  };

  const getManualNumbersDescription = () => {
    switch (selectedMode) {
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
          Crie ou importe apostas para a Lotomania usando critérios avançados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Critérios de Geração</CardTitle>
          <CardDescription>
            Escolha como suas apostas serão geradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de Geração</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aleatorio">Aleatório Puro</SelectItem>
                        <SelectItem value="completar_manual">Completar Números</SelectItem>
                        <SelectItem value="excluir_numeros">Excluir Números (Manual)</SelectItem>
                        <SelectItem value="evitar_base">Evitar Números da Base</SelectItem>
                        <SelectItem value="ai_strategy">Inteligência Artificial (Beta)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      O algoritmo que será usado para gerar os números.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
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

              <div className="md:flex md:items-end md:justify-end md:col-start-3">
                <Button type="submit" disabled={isGenerating} className="w-full md:w-auto">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Gerando...' : 'Gerar Apostas'}
                </Button>
              </div>
              
              {selectedMode === 'evitar_base' && (
                 <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="avoidanceBase"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Base de Números para Evitar</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="historico" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Todo o histórico de resultados
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="arquivo" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Números de um arquivo importado
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          A geração irá evitar todos os números únicos presentes na base escolhida.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {selectedMode === 'ai_strategy' && (
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="aiStrategy"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Estratégia da IA (Base: Histórico de Concursos)</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="hot" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Números Quentes (Mais Frequentes)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="cold" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Números Frios (Menos Frequentes)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="balanced" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Balanceado (Mix de Quentes e Frios)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          A IA usará o histórico de resultados para seguir a estratégia escolhida.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {(selectedMode === 'completar_manual' || selectedMode === 'excluir_numeros') && (
                <FormField
                  control={form.control}
                  name="manualNumbers"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
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
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Gerar com Base em Arquivo</CardTitle>
          <CardDescription>Faça upload de um arquivo (.txt, .csv) com números e use a IA para gerar apostas baseadas na análise estatística desse arquivo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv, .txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
            <Button variant="outline" onClick={handleUploadClick} className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              Localizar Arquivo
            </Button>
            {selectedFile && (
              <div className="flex items-center rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                Arquivo: <span className="ml-2 font-medium text-foreground">{selectedFile.name}</span>
              </div>
            )}
          </div>
          {selectedFile && (
            <Form {...fileImportForm}>
              <form onSubmit={(e) => { e.preventDefault(); generateBetsWithFile(); }} className="space-y-6">
                <FormField
                  control={fileImportForm.control}
                  name="aiFileStrategy"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Estratégia da IA (Base: Arquivo)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="hot" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Usar Números Quentes do arquivo (mais frequentes)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="cold" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Usar Números Frios do arquivo (menos frequentes)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="balanced" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Balancear (mix de quentes, frios e outros)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        A IA irá analisar as estatísticas do seu arquivo para gerar as apostas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isGenerating}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Analisando...' : 'Analisar Arquivo e Gerar com IA'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
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
               <div className="flex gap-2">
                 <Button variant="outline" onClick={handleOpenSaveModal} disabled={isUserLoading}>
                   <Bookmark className="mr-2 h-4 w-4"/> Salvar como Modelo
                 </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button><Download className="mr-2 h-4 w-4"/> Exportar</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport('csv')}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        <span>Excel (CSV)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('txt')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Texto (TXT)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('json')}>
                        <FileJson className="mr-2 h-4 w-4" />
                        <span>JSON</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                 <Button variant="ghost" size="icon" onClick={handleClear} title="Limpar apostas geradas">
                   <Trash2 className="h-4 w-4"/>
                   <span className="sr-only">Limpar</span>
                 </Button>
               </div>
             </div>
           </CardHeader>
           <CardContent>
             <div className="relative max-h-96 overflow-auto">
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

    