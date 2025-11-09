
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Bookmark, Download, Sparkles, Trash2, FileText, FileJson, FileCsv } from 'lucide-react';
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

const formSchema = z.object({
  mode: z.string({
    required_error: 'Por favor, selecione um modo de geração.',
  }),
  quantity: z.coerce
    .number()
    .min(1, { message: 'A quantidade deve ser no mínimo 1.' })
    .max(100, { message: 'A quantidade não pode ser maior que 100.' }),
  manualNumbers: z.string().optional(),
}).refine(data => {
  if (data.mode === 'completar_manual') {
    return !!data.manualNumbers && data.manualNumbers.trim() !== '';
  }
  return true;
}, {
  message: 'Por favor, insira os números que deseja fixar.',
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
  const bet: Set<number> = mode === 'completar_manual' ? new Set(manualNumbers) : new Set();
  
  if (bet.size >= 50) {
    return Array.from(bet).slice(0, 50).sort((a, b) => a - b);
  }

  while (bet.size < 50) {
    const randomNumber = Math.floor(Math.random() * 100);
    if (!bet.has(randomNumber)) {
      bet.add(randomNumber);
    }
  }
  return Array.from(bet).sort((a, b) => a - b);
}

export default function GeneratePage() {
  const [generatedBets, setGeneratedBets] = useState<Bet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 10,
      mode: 'aleatorio',
      manualNumbers: '',
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

  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedBets([]);

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
    
    // Simulating generation delay
    setTimeout(() => {
      const bets = Array.from({ length: data.quantity }, () => generateBet(data.mode, manualNumbersSet));
      setGeneratedBets(bets);
      setIsGenerating(false);
    }, 1000);
  }

  function handleClear() {
    setGeneratedBets([]);
  }

  function handleExport(format: 'csv' | 'json' | 'txt') {
    // Mock export logic
    toast({
      title: 'Exportação iniciada',
      description: `Seu arquivo no formato ${format.toUpperCase()} está sendo preparado.`,
    });
    console.log(`Exporting ${generatedBets.length} bets in ${format} format.`);
  }

  function handleSaveTemplate(values: z.infer<typeof templateFormSchema>) {
    const generationCriteria = form.getValues();
    
    // Mock save logic. We will connect to Firestore later.
    console.log('Saving template:', {
      templateDetails: values,
      generationCriteria,
    });
    
    toast({
      title: 'Modelo salvo!',
      description: `O modelo "${values.name}" foi salvo com sucesso.`,
    });

    setSaveTemplateModalOpen(false);
    templateForm.reset();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Gerar Apostas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Crie novas apostas para a Lotomania usando critérios avançados.
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
                        <SelectItem value="balanceado" disabled>Balanceado por Faixa (em breve)</SelectItem>
                        <SelectItem value="soma_alvo" disabled>Soma Alvo (em breve)</SelectItem>
                        <SelectItem value="hot_cold" disabled>Hot/Cold (em breve)</SelectItem>
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

              <div className="md:col-start-3 md:flex md:items-end md:justify-end">
                <Button type="submit" disabled={isGenerating}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Gerando...' : 'Gerar Apostas'}
                </Button>
              </div>

              {selectedMode === 'completar_manual' && (
                <FormField
                  control={form.control}
                  name="manualNumbers"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Números para Completar</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite os números separados por espaço ou vírgula. Ex: 5 12 23 45 88"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        O sistema usará esses números e gerará o restante aleatoriamente até completar 50.
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
                 <Button variant="outline" onClick={() => setSaveTemplateModalOpen(true)}>
                   <Bookmark className="mr-2 h-4 w-4"/> Salvar como Modelo
                 </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button><Download className="mr-2 h-4 w-4"/> Exportar</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport('csv')}>
                        <FileCsv className="mr-2 h-4 w-4" />
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

