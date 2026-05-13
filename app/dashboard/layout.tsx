import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { cookies } from "next/headers"
import { TooltipProvider } from "@/components/ui/tooltip"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <main className="flex w-full flex-col h-screen overflow-hidden">
          <header className="flex h-14 items-center border-b px-4 lg:px-6">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  )
}
