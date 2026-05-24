import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HeaderUserMenu } from "@/components/header-user-menu"
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
        <main className="relative flex w-full flex-col h-screen overflow-hidden">
          <header
            className="flex h-16 shrink-0 items-center justify-between border-b-2 border-red-600 px-4 lg:px-6"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white" />
            <HeaderUserMenu />
          </header>
          <div className="relative flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-gray-50">
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
              <img src="/background-image.jpeg" alt="" style={{ width: "520px", height: "auto", flexShrink: 0 }} />
            </div>
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  )
}
