import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Sparkles, FileUp, Bookmark, History } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";

const dashboardCards = [
  {
    title: "Gerar Apostas",
    description: "Crie novas apostas usando diversos critérios e estratégias.",
    href: "/generate",
    icon: Sparkles,
    imageId: "generate-bets",
  },
  {
    title: "Importar Arquivo",
    description: "Faça upload de números e estatísticas para gerar jogos.",
    href: "/import",
    icon: FileUp,
    imageId: "import-file",
  },
  {
    title: "Meus Modelos",
    description: "Salve e reutilize seus critérios de geração favoritos.",
    href: "/templates",
    icon: Bookmark,
    imageId: "my-templates",
  },
  {
    title: "Histórico",
    description: "Veja suas atividades recentes, como jogos e exportações.",
    href: "/history",
    icon: History,
    imageId: "history",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center md:text-left">
        <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">
          Bem-vindo ao Lotomania Master
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sua ferramenta completa para análise e geração de apostas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((card) => {
          const image = PlaceHolderImages.find((p) => p.id === card.imageId);
          return (
            <Card
              key={card.href}
              className="group flex transform flex-col overflow-hidden rounded-lg shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            >
              <CardHeader className="p-0">
                <div className="relative h-40 w-full">
                  {image && (
                    <Image
                      src={image.imageUrl}
                      alt={image.description}
                      data-ai-hint={image.imageHint}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex-1">
                  <card.icon className="mb-3 h-7 w-7 text-primary" />
                  <CardTitle className="font-headline text-xl">{card.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">
                    {card.description}
                  </CardDescription>
                </div>
                <Button asChild variant="link" className="mt-4 self-start p-0 text-primary">
                  <Link href={card.href}>
                    Acessar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
