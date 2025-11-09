
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
import { useForm } from 'react-hook-form';
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
import { Bookmark, Download, Sparkles, Trash2 } from 'lucide-react';

const formSchema = z.object({
  mode: z.string({
    required_error: 'Por favor, selecione um modo de geração.',
  }),
  quantity: z.coerce
    .number()
    .min(1, { message: 'A quantidade deve ser no mínimo 1.' })
    .max(100, { message: 'A quantidade não pode ser maior que 100.' }),
});

type Bet = number[];

function generateRandomBet(): Bet {
  const bet: Set<number> = new Set();
  while (bet.size < 50) {
    bet.add(Math.floor(Math.random() * 100));
  }
  return Array.from(bet).sort((a, b) => a - b);
}

export default function GeneratePage() {
  const [generatedBets, setGeneratedBets] = useState<Bet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 10,
      mode: 'aleatorio',
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedBets([]);
    
    // Simulating generation delay
    setTimeout(() => {
      const bets = Array.from({ length: data.quantity }, generateRandomBet);
      setGeneratedBets(bets);
      setIsGenerating(false);
    }, 1000);
  }

  function handleClear() {
    setGeneratedBets([]);
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
                 <Button variant="outline"><Bookmark className="mr-2 h-4 w-4"/> Salvar como Modelo</Button>
                 <Button><Download className="mr-2 h-4 w-4"/> Exportar</Button>
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
    </div>
  );
}
