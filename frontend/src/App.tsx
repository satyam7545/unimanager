import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './features/auth/store/authStore';
import { authService } from './features/auth/services/auth.service';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MainLayout } from './layouts/MainLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

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
      staleTime: 1000 * 60, // 60 seconds fresh cache
      gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
    },
  },
});

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const location = useLocation(); // Need this for AnimatePresence

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
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/subjects" element={<PageTransition><Subjects /></PageTransition>} />
            <Route path="/subjects/:id" element={<PageTransition><Subjects /></PageTransition>} />
            <Route path="/notes" element={<PageTransition><Notes /></PageTransition>} />
            <Route path="/notes/:id" element={<PageTransition><Notes /></PageTransition>} />
            <Route path="/assignments" element={<PageTransition><Assignments /></PageTransition>} />
            <Route path="/planner" element={<PageTransition><Planner /></PageTransition>} />
            <Route path="/calendar" element={<PageTransition><Calendar /></PageTransition>} />
            <Route path="/projects" element={<PageTransition><Projects /></PageTransition>} />
            <Route path="/habits" element={<PageTransition><Habits /></PageTransition>} />
            <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
            <Route path="/ai" element={<PageTransition><AIAssistant /></PageTransition>} />
            <Route path="/ai-assistant" element={<Navigate to="/ai" replace />} />
            <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </MainLayout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
