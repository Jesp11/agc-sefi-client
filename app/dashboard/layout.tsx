import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PWAProvider } from "@/components/pwa-provider";
import { GlobalSearchDialog, SearchTriggerButton } from "@/components/global-search-dialog";
import { cookies } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <main className="relative flex w-full flex-col h-screen overflow-hidden">
          <header
            className="flex h-16 shrink-0 items-center justify-between gap-3 border-b-2 border-red-600 px-4 lg:px-6"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white" />
              <SearchTriggerButton className="w-full max-w-xs md:max-w-sm" />
            </div>
            <HeaderUserMenu />
          </header>
          <GlobalSearchDialog />
          <div className="relative flex-1 overflow-auto p-4 pb-28 md:pb-8 lg:p-8 bg-gray-50">
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.07,
                pointerEvents: "none",
                zIndex: 0,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/background-image.jpeg"
                alt=""
                style={{ width: "520px", height: "auto", flexShrink: 0 }}
              />
            </div>
            <div className="relative z-10">{children}</div>
          </div>
          <MobileBottomNav />
          <PWAProvider />
        </main>
      </SidebarProvider>
    </TooltipProvider>
  );
}
