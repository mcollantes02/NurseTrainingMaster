import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Login = lazy(() => import("@/pages/auth/login"));
const Register = lazy(() => import("@/pages/auth/register"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Statistics = lazy(() => import("@/pages/statistics"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={isAuthenticated ? Dashboard : Login} />
        <Route path="/dashboard" component={isAuthenticated ? Dashboard : Login} />
        <Route path="/login" component={isAuthenticated ? Dashboard : Login} />
        <Route path="/register" component={isAuthenticated ? Dashboard : Register} />
        <Route path="/statistics" component={isAuthenticated ? Statistics : Login} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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