import React, { useEffect, useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './features/auth/store/authStore';
import { useUIStore } from './store/uiStore';
import { authService } from './features/auth/services/auth.service';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MainLayout } from './layouts/MainLayout';
import { motion } from 'framer-motion';
import { Sparkles, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';

// Lazy load workspace pages for bundle performance optimization
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Subjects = lazy(() => import('./pages/Subjects').then(m => ({ default: m.Subjects })));
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const Assignments = lazy(() => import('./pages/Assignments').then(m => ({ default: m.Assignments })));
const Planner = lazy(() => import('./pages/Planner').then(m => ({ default: m.Planner })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const Habits = lazy(() => import('./pages/Habits').then(m => ({ default: m.Habits })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const AIAssistant = lazy(() => import('./pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { activeSection } = useUIStore();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Trigger checkSession once at mount to retrieve valid cookies
  useEffect(() => {
    authService.checkSession();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow rings */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-violet-400 flex items-center justify-center shadow-lg shadow-primary/30 relative">
            <span className="font-extrabold text-white text-xl">UM</span>
            <div className="absolute inset-0 rounded-2xl border border-white/20 animate-ping opacity-25" />
          </div>
          
          <div className="flex flex-col items-center mt-2">
            <span className="text-sm font-semibold tracking-wider uppercase text-zinc-400">UniManager</span>
            <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden mt-3 relative">
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-primary"
                initial={{ left: '-100%', width: '100%' }}
                animate={{ left: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <Login onNavigateToRegister={() => setAuthView('register')} />
    ) : (
      <Register onNavigateToLogin={() => setAuthView('login')} />
    );
  }

  // Switch display panels based on selected sidebar item
  const renderContent = () => {
    switch (activeSection) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Subjects':
        return <Subjects />;
      case 'Notes':
        return <Notes />;
      case 'Assignments':
        return <Assignments />;
      case 'Planner':
        return <Planner />;
      case 'Calendar':
        return <Calendar />;
      case 'Projects':
        return <Projects />;
      case 'Habits':
        return <Habits />;
      case 'Analytics':
        return <Analytics />;
      case 'AI Assistant':
        return <AIAssistant />;
      case 'Settings':
        return <Settings />;
      case 'Profile':
        return <Profile />;
      default:
        // Premium placeholder card for sections coming in future phases
        return (
          <div className="h-[60vh] flex items-center justify-center">
            <GlassCard hoverEffect={false} className="max-w-md border-white/5 text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{activeSection} Workspace</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                This feature is scheduled for development in the upcoming phase of UniManager. We are coding round-the-clock!
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-primary font-semibold bg-primary/5 border border-primary/10 px-4 py-2 rounded-full">
                <CalendarIcon className="w-4 h-4" />
                <span>Coming in next release phase</span>
              </div>
            </GlassCard>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs text-zinc-500 font-semibold tracking-wide">Initializing workspace...</span>
          </div>
        }
      >
        {renderContent()}
      </Suspense>
    </MainLayout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
