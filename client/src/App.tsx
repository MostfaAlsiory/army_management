import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
import Personnel from "@/pages/Personnel";
import Attendance from "@/pages/Attendance";
import Reports from "@/pages/Reports";
import AggregatedReports from "@/pages/AggregatedReports";
import ReportTemplates from "@/pages/ReportTemplates";
import Violations from "@/pages/Violations";
import Excuses from "@/pages/Excuses";
import ActivityLogs from "@/pages/ActivityLogs";
import Backups from "@/pages/Backups";
import CustomFields from "@/pages/CustomFields";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/personnel" component={Personnel}/>
        <Route path="/attendance" component={Attendance}/>
        <Route path="/violations" component={Violations}/>
        <Route path="/excuses" component={Excuses}/>
        <Route path="/reports" component={Reports}/>
        <Route path="/aggregated-reports" component={AggregatedReports}/>
        <Route path="/report-templates" component={ReportTemplates}/>
        <Route path="/activity-logs" component={ActivityLogs}/>
        <Route path="/backups" component={Backups}/>
        <Route path="/custom-fields" component={CustomFields}/>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
