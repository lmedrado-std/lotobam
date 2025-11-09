import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Importar Arquivo</h1>
        <p className="text-muted-foreground mt-2">Faça upload de seus próprios números e estatísticas.</p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>Esta funcionalidade está sendo desenvolvida.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Em breve, você poderá fazer upload de arquivos CSV, TXT e JSON para gerar apostas ou alimentar as estatísticas do sistema.</p>
        </CardContent>
      </Card>
    </div>
  );
}
