import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GeneratePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Gerar Apostas</h1>
        <p className="text-muted-foreground mt-2">Crie novas apostas para a Lotomania usando critérios avançados.</p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>Esta funcionalidade está sendo desenvolvida.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Volte em breve para encontrar uma ferramenta poderosa de geração de apostas, com opções de personalização, sugestões de IA e muito mais.</p>
        </CardContent>
      </Card>
    </div>
  );
}
