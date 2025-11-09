
'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { User, Bell, LogOut } from "lucide-react";
import { useFirebase } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "firebase/auth";

export function Header() {
  const { auth, user } = useFirebase();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="w-full flex-1">
        {/* Header content can be added here */}
      </div>
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Toggle notifications</span>
      </Button>
      {user && (
         <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <User className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
           <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
           <DropdownMenuSeparator />
           <DropdownMenuItem onClick={() => signOut(auth)}>
              <LogOut className="mr-2 h-4 w-4" />
             <span>Sair</span>
           </DropdownMenuItem>
         </DropdownMenuContent>
       </DropdownMenu>
      )}
    </header>
  );
}
