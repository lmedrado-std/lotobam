import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Meus Modelos</h1>
        <p className="text-muted-foreground mt-2">Salve e gerencie seus critérios de geração de apostas.</p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>Esta funcionalidade está sendo desenvolvida.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Aqui você poderá salvar, editar e reutilizar suas combinações de critérios favoritas para gerar novas apostas com apenas um clique.</p>
        </CardContent>
      </Card>
    </div>
  );
}
