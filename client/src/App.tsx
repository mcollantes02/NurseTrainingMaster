import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import NotFound from "@/pages/not-found";
import Statistics from "@/pages/statistics"; // Assuming this component exists

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Dashboard} />
        <Route path="/register" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // If user is not authenticated, show auth pages or redirect to login
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Login} />
      <Route path="/statistics" component={Login} />
      <Route path="/" component={Login} />
      <Route component={NotFound} />
    </Switch>
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