import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground mt-2">Veja suas atividades recentes no aplicativo.</p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>Esta funcionalidade está sendo desenvolvida.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Em breve, esta página exibirá um registro detalhado de todas as suas gerações, importações e exportações de apostas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
