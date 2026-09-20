import { Button } from '#/components/ui/button';
import { Skeleton } from '#/components/ui/skeleton';
import { useAuth } from '#/hooks/useAuth';
import { useDarkMode } from '#/hooks/useDarkMode';
import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { MonitorCogIcon, MoonIcon, SunIcon } from "lucide-react";
import type { ReactElement } from "react";

export const Route = createFileRoute('/investment')({
  component: InvestmentLayout,
});

const themeCycle: Record<string, [/* value */string, /* icon */ReactElement]> = {
  light: ['dark', <SunIcon />],
  dark: ['auto', <MoonIcon />],
  auto: ['light', <MonitorCogIcon />],
};

function InvestmentLayout() {
  const location = useLocation();
  const [theme, setTheme] = useDarkMode();
  const { user, isAllowed, isLoading, signOut } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Unauthenticated - redirect to sign-in (unless already there)
  if (!user) {
    if (location.pathname === '/investment/sign-in') {
      return <Outlet />;
    }
    return <Navigate to="/investment/sign-in" />;
  }

  // Authenticated but not allowed
  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Not Allowed</h1>
          <p className="text-gray-600">
            Your account does not have access to the investment module. Please
            contact the administrator if you believe this is an error.
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Authenticated and allowed
  return (
    <div>
      {location.pathname !== '/investment/sign-in' && (
        <nav className="border-b bg-background">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <Link
                  to="/investment"
                  className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/investment' ||
                    location.pathname === '/investment/'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                    }`}
                >
                  Overview
                </Link>
                <Link
                  to="/investment/transactions"
                  className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/investment/transactions'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                    }`}
                >
                  Transactions
                </Link>
                <Link
                  to="/investment/timeline"
                  className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/investment/timeline'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                    }`}
                >
                  Timeline
                </Link>
                <Link
                  to="/investment/thesis"
                  className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/investment/thesis'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                    }`}
                >
                  Thesis
                </Link>
                <Link
                  to="/investment/settings"
                  className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/investment/settings'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                    }`}
                >
                  Settings
                </Link>
              </div>
              <div className="flex gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(themeCycle[theme][0])}
                >
                  {themeCycle[theme][1]}
                </Button>

                <button
                  onClick={signOut}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      <Outlet />
    </div>
  );
}
