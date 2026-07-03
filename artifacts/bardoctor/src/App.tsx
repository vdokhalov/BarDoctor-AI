import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ToastProvider, ToastContainer } from '@/components/ds/Toast';

import NotFound from '@/pages/not-found';
import Splash from '@/pages/Splash';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import CreateRestaurant from '@/pages/CreateRestaurant';
import Home from '@/pages/Home';
import Analysis from '@/pages/Analysis';
import Add from '@/pages/Add';
import Tasks from '@/pages/Tasks';
import Equipment from '@/pages/Equipment';
import Profile from '@/pages/Profile';
import DesignSystem from '@/pages/DesignSystem';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding" component={CreateRestaurant} />
      <Route path="/home" component={Home} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/add" component={Add} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/equipment" component={Equipment} />
      <Route path="/profile" component={Profile} />
      <Route path="/design-system" component={DesignSystem} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <ToastContainer />
        </ToastProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
