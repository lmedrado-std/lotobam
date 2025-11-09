
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


type Bet = number[];

function parseManualNumbers(numbersStr: string | undefined): Set<number> {
  if (!numbersStr) return new Set();
  const numbers = numbersStr.split(/[\s,]+/).filter(Boolean).map(n => parseInt(n, 10));
  const validNumbers = numbers.filter(n => !isNaN(n) && n >= 0 && n <= 99);
  return new Set(validNumbers);
}

function generateBet(mode: string, manualNumbers: Set<number>): Bet {
  let bet: Set<number>;

  if (mode === 'completar_manual') {
    bet = new Set(manualNumbers);
  } else {
    bet = new Set();
  }
  
  if (bet.size >= 50) {
    return Array.from(bet).slice(0, 50).sort((a, b) => a - b);
  }
  
  const exclusionSet = mode === 'excluir_numeros' ? manualNumbers : new Set();

  while (bet.size < 50) {
    const randomNumber = Math.floor(Math.random() * 100);
    if (!bet.has(randomNumber) && !exclusionSet.has(randomNumber)) {
      bet.add(randomNumber);
    }
  }
  return Array.from(bet).sort((a, b) => a - b);
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
    },
  });
  
  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const selectedMode = useWatch({
    control: form.control,
    name: 'mode',
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedBets([]);

    if (data.mode === 'ai_strategy') {
      try {
        toast({
          title: 'A IA está pensando...',
          description: 'Analisando o histórico de resultados para criar as melhores apostas.',
        });
        const response = await suggestBetsFromHistory({
          history: resultsHistory,
          strategy: data.aiStrategy || 'balanced',
          numberOfBets: data.quantity,
        });
        setGeneratedBets(response.suggestions);
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


    const manualNumbersSet = parseManualNumbers(data.manualNumbers);

    if (data.mode === 'completar_manual' && manualNumbersSet.size >= 50) {
      toast({
        variant: "destructive",
        title: "Muitos números inseridos",
        description: "Você inseriu 50 ou mais números. Não é necessário completar.",
      });
      const singleBet = Array.from(manualNumbersSet).slice(0, 50).sort((a,b) => a - b);
      setGeneratedBets([singleBet]);
      setIsGenerating(false);
      return;
    }
    
    if (data.mode === 'excluir_numeros' && manualNumbersSet.size > 50) {
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
      const bets = Array.from({ length: data.quantity }, () => generateBet(data.mode, manualNumbersSet));
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
      csv: { extension: 'csv', contentType: 'text/csv' },
      json: { extension: 'json', contentType: 'application/json' },
      txt: { extension: 'txt', contentType: 'text/plain' },
    };

    const { extension, contentType } = fileMap[format];
    const fileContent = formatBets(generatedBets, format);
    downloadFile(fileContent, `lotomania-apostas-${Date.now()}.${extension}`, contentType);

    toast({
      title: 'Exportação Concluída',
      description: `Seu arquivo no formato ${format.toUpperCase()} foi baixado.`,
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
                        <SelectItem value="excluir_numeros">Excluir Números</SelectItem>
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

              {selectedMode === 'ai_strategy' && (
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="aiStrategy"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Estratégia da IA</FormLabel>
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
          <CardTitle>Importar Arquivo</CardTitle>
          <CardDescription>Faça upload de um arquivo .txt ou .csv para usar como base para a geração.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv, .txt"
          />
          <Button variant="outline" onClick={handleUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Localizar Arquivo
          </Button>
          {selectedFile && (
            <p className="mt-4 text-sm text-muted-foreground">
              Arquivo selecionado: <span className="font-medium text-foreground">{selectedFile.name}</span>
            </p>
          )}
        </CardContent>
        {selectedFile && (
            <CardFooter>
                <Button>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar com Base no Arquivo
                </Button>
            </CardFooter>
        )}
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
                        <span>CSV</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('txt')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>TXT</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('json')}>
                        <FileJson className="mr-2 h-4 w-4" />
                        <span>JSON</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                 <Button variant="ghost" size="icon" onClick={handleClear}><Trash2 className="h-4 w-4"/></Button>
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
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {bet.map((num) => (
                            <Badge
                              key={num}
                              variant="secondary"
                              className="flex h-7 w-7 items-center justify-center text-xs"
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

    
