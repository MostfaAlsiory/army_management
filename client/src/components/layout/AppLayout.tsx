import { Link, useLocation } from "wouter";
import { 
  Users, 
  LayoutDashboard, 
  CalendarCheck, 
  FileBarChart,
  Shield,
  Menu,
  ChevronLeft,
  Download,
  AlertOctagon,
  FileText,
  History,
  DatabaseBackup
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "لوحة القيادة", url: "/", icon: LayoutDashboard },
  { title: "شؤون الأفراد", url: "/personnel", icon: Users },
  { title: "الحضور والغياب", url: "/attendance", icon: CalendarCheck },
  { title: "المخالفات والجزاءات", url: "/violations", icon: AlertOctagon },
  { title: "الأعذار والإجازات", url: "/excuses", icon: FileText },
  { title: "التقارير", url: "/reports", icon: FileBarChart },
  { title: "قوالب التقارير", url: "/report-templates", icon: FileText },
  { title: "النسخ الاحتياطي", url: "/backups", icon: DatabaseBackup },
  { title: "سجل النظام", url: "/activity-logs", icon: History },
];

function DownloadButton() {
  const handleDownload = () => {
    window.open('/api/download-project', '_blank');
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        onClick={handleDownload}
        className="py-6 px-4 rounded-xl transition-all duration-200 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <div className="flex items-center gap-3 w-full">
          <Download className="h-5 w-5 text-sidebar-foreground/70" />
          <span className="font-semibold text-base">تحميل المشروع</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar variant="sidebar" side="right" collapsible="icon" className="border-l border-sidebar-border shadow-xl">
      <SidebarHeader className="border-b border-sidebar-border/50 py-4 px-4 bg-sidebar-background">
        <div className="flex items-center gap-3 w-full">
          <div className="bg-primary/20 p-2 rounded-lg text-primary-foreground shadow-inner">
            <Shield className="h-6 w-6" />
          </div>
          <span className="font-display font-bold text-lg tracking-wide text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            نظام شؤون الأفراد
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-sidebar-background px-2 pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider mb-2 pe-2">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        py-6 px-4 rounded-xl transition-all duration-200 group
                        ${isActive 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary hover:text-primary-foreground" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"}`} />
                        <span className="font-semibold text-base">{item.title}</span>
                        {isActive && <ChevronLeft className="h-4 w-4 ms-auto opacity-70" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <div className="mt-4 border-t border-sidebar-border/50 pt-4">
                <DownloadButton />
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden rtl">
        <AppSidebar />
        
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-10 w-10 text-foreground hover:bg-muted rounded-full" />
              <h1 className="font-display text-xl font-bold text-foreground">القيادة العامة</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                ق
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full bg-background/50">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}