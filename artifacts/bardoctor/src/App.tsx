import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { ToastProvider, ToastContainer } from '@/components/ds/Toast';
import { RestaurantProvider, useRestaurant } from '@/contexts/RestaurantContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { EmployeesProvider } from '@/contexts/EmployeesContext';
import { CasesProvider } from '@/contexts/CasesContext';
import { DecisionsProvider } from '@/contexts/DecisionsContext';

import NotFound     from '@/pages/not-found';
import Splash       from '@/pages/Splash';
import Login        from '@/pages/Login';
import Register     from '@/pages/Register';
import Onboarding   from '@/pages/Onboarding';
import Home         from '@/pages/Home';
import Analysis     from '@/pages/Analysis';
import Add          from '@/pages/Add';
import Events       from '@/pages/Events';
import Tasks        from '@/pages/Tasks';
import Equipment    from '@/pages/Equipment';
import Employees    from '@/pages/Employees';
import Cases        from '@/pages/Cases';
import AddCase      from '@/pages/AddCase';
import CaseDetail   from '@/pages/CaseDetail';
import EventDetail  from '@/pages/EventDetail';
import Profile      from '@/pages/Profile';
import More         from '@/pages/More';
import ComingSoon   from '@/pages/ComingSoon';
import Health      from '@/pages/Health';
import Decisions   from '@/pages/Decisions';
import SmartInput  from '@/pages/SmartInput';
import DesignSystem from '@/pages/DesignSystem';

const queryClient = new QueryClient();

// ─── Route guard ──────────────────────────────────────────────────────────────

function RequireProfile({ component: Component }: { component: React.ComponentType }) {
  const { profile } = useRestaurant();
  if (!profile) return <Redirect to="/setup" />;
  return <Component />;
}

// ─── Router ───────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/"         component={Splash} />
      <Route path="/setup"    component={Onboarding} />
      <Route path="/login"    component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected — require completed onboarding */}
      <Route path="/home"          component={() => <RequireProfile component={Home} />} />
      <Route path="/analysis"      component={() => <RequireProfile component={Analysis} />} />
      <Route path="/smart"         component={() => <RequireProfile component={SmartInput} />} />
      <Route path="/add"           component={() => <RequireProfile component={Add} />} />
      <Route path="/events/:id"    component={() => <RequireProfile component={EventDetail} />} />
      <Route path="/events"        component={() => <RequireProfile component={Events} />} />
      <Route path="/tasks"         component={() => <RequireProfile component={Tasks} />} />
      <Route path="/decisions"     component={() => <RequireProfile component={Decisions} />} />
      <Route path="/equipment"     component={() => <RequireProfile component={Equipment} />} />
      <Route path="/profile"       component={() => <RequireProfile component={Profile} />} />
      <Route path="/more"          component={() => <RequireProfile component={More} />} />
      <Route path="/employees"     component={() => <RequireProfile component={Employees} />} />
      {/* Cases — specific paths before dynamic :id */}
      <Route path="/health"         component={() => <RequireProfile component={Health} />} />

      <Route path="/cases/add"     component={() => <RequireProfile component={AddCase} />} />
      <Route path="/cases/:id"     component={() => <RequireProfile component={CaseDetail} />} />
      <Route path="/cases"         component={() => <RequireProfile component={Cases} />} />
      <Route path="/suppliers"     component={() => <RequireProfile component={ComingSoon} />} />
      <Route path="/warehouse"     component={() => <RequireProfile component={ComingSoon} />} />
      <Route path="/reports"       component={() => <RequireProfile component={ComingSoon} />} />
      <Route path="/notifications" component={() => <RequireProfile component={ComingSoon} />} />
      <Route path="/settings"      component={() => <RequireProfile component={ComingSoon} />} />
      <Route path="/about"         component={() => <RequireProfile component={ComingSoon} />} />

      {/* Dev */}
      <Route path="/design-system" component={DesignSystem} />

      <Route component={NotFound} />
    </Switch>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RestaurantProvider>
        <EventsProvider>
          <EmployeesProvider>
          <CasesProvider>
          <DecisionsProvider>
          <TooltipProvider>
            <ToastProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Router />
              </WouterRouter>
              <ToastContainer />
            </ToastProvider>
            <Toaster />
          </TooltipProvider>
          </DecisionsProvider>
          </CasesProvider>
          </EmployeesProvider>
        </EventsProvider>
      </RestaurantProvider>
    </QueryClientProvider>
  );
}

export default App;
