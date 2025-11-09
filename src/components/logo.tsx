import { Ticket } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="LotoBam Home">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors group-hover:bg-primary/90">
        <Ticket className="h-5 w-5" />
      </div>
      <span className="hidden text-lg font-semibold text-primary group-data-[state=expanded]:inline-block group-data-[collapsible=icon]:hidden font-headline">
        LotoBam
      </span>
    </Link>
  );
}
