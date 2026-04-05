import Why from "./pages/why";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-provider";
import { Navbar } from "./components/navbar";
import { ComplianceDisclaimer } from "./components/compliance-disclaimer";
import NewLanding from "./pages/new-landing/Landing";
import HowItWorks from "./pages/new-landing/HowItWorks";
import WhyNevara from "./pages/new-landing/WhyNevara";
import Roadmap from "./pages/new-landing/Roadmap";
import About from "./pages/new-landing/About";
import Login from "./pages/login";
import UserDashboard from "./pages/user-dashboard";
import AdminDashboard from "./pages/admin-dashboard";
import VerifierDashboard from "./pages/verifier-dashboard";
import Marketplace from "./pages/marketplace";
import Explorer from "./pages/explorer";
import NotFound from "./pages/not-found";
import TermsOfService from "./pages/terms";
import PrivacyPolicy from "./pages/privacy";

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const roleRedirects: Record<string, string> = {
      admin: '/admin',
      verifier: '/verifier',
      contributor: '/dashboard',
      buyer: '/marketplace',
    };
    return <Redirect to={roleRedirects[user.role] || '/dashboard'} />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Switch>
        <Route path="/" component={NewLanding} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/why-nevara" component={WhyNevara} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/about" component={About} />

        {/* Platform Routes with Navbar */}
        <Route path="/:rest*">
          {() => (
            <>
              <Navbar />
              <Switch>
                <Route path="/login" component={Login} />
                <Route path="/dashboard">
                  {() => <ProtectedRoute component={UserDashboard} allowedRoles={['contributor']} />}
                </Route>
                <Route path="/marketplace">
                  {() => <ProtectedRoute component={Marketplace} allowedRoles={['buyer']} />}
                </Route>
                <Route path="/admin">
                  {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />}
                </Route>
                <Route path="/verifier">
                  {() => <ProtectedRoute component={VerifierDashboard} allowedRoles={['verifier']} />}
                </Route>
                <Route path="/explorer" component={Explorer} />
                <Route path="/why" component={Why} />
                <Route path="/terms" component={TermsOfService} />
                <Route path="/privacy" component={PrivacyPolicy} />
                <Route component={NotFound} />
              </Switch>
            </>
          )}
        </Route>
      </Switch>
      {/* Task 9.3: Persistent compliance disclaimer on every page */}
      <ComplianceDisclaimer variant="banner" />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
