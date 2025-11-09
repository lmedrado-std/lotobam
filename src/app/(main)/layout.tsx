
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { redirect } from "next/navigation";
import { FirebaseClientProvider, useUser } from "@/firebase";
import { AuthContent } from "@/components/layout/auth-content";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const avatarImage = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  return (
    <FirebaseClientProvider>
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarNav />
            </SidebarContent>
            <SidebarFooter className="border-t p-2">
              <AuthContent />
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <Header />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
    </FirebaseClientProvider>
  );
}
