'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';

export default function ResultsPage() {
    const { toast } = useToast();

    const handleUpdateResults = () => {
        toast({
            title: "Em breve!",
            description: "A funcionalidade de atualização automática dos resultados será implementada em breve.",
        });
    }

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Concursos</CardTitle>
              <CardDescription>
                Visualize os resultados dos sorteios anteriores.
              </CardDescription>
            </div>
            <Button onClick={handleUpdateResults}>
              <Download className="mr-2 h-4 w-4" />
              Atualizar Resultados
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
            <p className="text-muted-foreground">
              A exibição dos resultados será implementada aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
