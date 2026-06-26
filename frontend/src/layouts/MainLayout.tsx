import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  FolderGit2,
  Flame,
  BarChart3,
  Sparkles,
  User,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Check,
  Trash2,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { authService } from '@/features/auth/services/auth.service';
import { api } from '@/services/api';


interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { sidebarOpen, activeSection, toggleSidebar, setActiveSection, selectedSemester, setSelectedSemester } = useUIStore();
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize selectedSemester to user's semester if available on first load
  useEffect(() => {
    if (user?.semester && selectedSemester === 'all') {
      setSelectedSemester(user.semester);
    }
  }, [user]);

  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [prevNotificationIds, setPrevNotificationIds] = useState<string[]>([]);

  // Search state & query logic
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Ctrl+K search palette hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return null;
      const res = await api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.data;
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  // Fetch notifications log
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data?.notifications || [];
    },
    refetchInterval: 30000, // Poll every 30s for assignments / habits / exam alerts
    enabled: !!user, // Only fetch when logged in
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  // Sound and push alerts triggers
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const isSoundEnabled = localStorage.getItem('sound_enabled') !== 'false';
    const isPushEnabled = localStorage.getItem('push_enabled') === 'true';

    // Populate initially on first load, so we only alert for new items that arise during session
    if (prevNotificationIds.length === 0) {
      setPrevNotificationIds(notifications.map((n: any) => n.id));
      return;
    }

    // Identify new unread notifications
    const newUnread = notifications.filter(
      (n: any) => !n.isRead && !prevNotificationIds.includes(n.id)
    );

    if (newUnread.length > 0) {
      // Add new IDs to state to prevent re-alerting
      setPrevNotificationIds((prev) => [...prev, ...newUnread.map((n: any) => n.id)]);

      // Play audio chime
      if (isSoundEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
          
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
          console.warn('Audio play blockaded or unsupported:', e);
        }
      }

      // Trigger standard browser push
      if (isPushEnabled && 'Notification' in window && Notification.permission === 'granted') {
        newUnread.forEach((n: any) => {
          new Notification(n.title, {
            body: n.message,
            icon: '/icon-192.png',
          });
        });
      }
    } else {
      // Synchronize list if items are read or deleted
      const allIds = notifications.map((n: any) => n.id);
      const needsSync = allIds.some((id: string) => !prevNotificationIds.includes(id)) || 
                        prevNotificationIds.some((id) => !allIds.includes(id));
      if (needsSync) {
        setPrevNotificationIds(allIds);
      }
    }
  }, [notifications, prevNotificationIds]);

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Handle clicking outside to dismiss dropdown drawer
  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClose = () => setNotificationsOpen(false);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [notificationsOpen]);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('assignment')) {
      return <ClipboardList className="w-4 h-4 text-sky-400" />;
    }
    if (lower.includes('exam')) {
      return <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />;
    }
    if (lower.includes('habit')) {
      return <Flame className="w-4 h-4 text-orange-500 fill-orange-500/25" />;
    }
    return <Info className="w-4 h-4 text-primary" />;
  };


  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Subjects', icon: BookOpen },
    { name: 'Notes', icon: FileText },
    { name: 'Assignments', icon: ClipboardList },
    { name: 'Planner', icon: CalendarRange },
    { name: 'Calendar', icon: CalendarDays },
    { name: 'Projects', icon: FolderGit2 },
    { name: 'Habits', icon: Flame },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'AI Assistant', icon: Sparkles },
    { name: 'Profile', icon: User },
    { name: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await authService.logout();
  };

  return (
    <div className="min-h-screen flex text-foreground bg-background selection:bg-primary/20">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-white/5 bg-black/45 backdrop-blur-xl transition-all duration-300 relative ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-violet-400 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <span className="font-extrabold text-white text-sm">UM</span>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-bold text-lg bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent truncate shrink-0"
                >
                  UniManager
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Study Streak Display */}
        {sidebarOpen && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="m-4 p-3 rounded-lg border border-white/5 bg-white/[0.02] flex items-center gap-3 overflow-hidden shrink-0"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
              <Flame className="w-4 h-4 fill-orange-500" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground leading-none">Study Streak</span>
              <span className="font-bold text-sm text-orange-500">{user.studyStreak || 0} Days Active</span>
            </div>
          </motion.div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto select-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.name;

            return (
              <button
                key={item.name}
                onClick={() => setActiveSection(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'text-white bg-primary/10 shadow-inner shadow-primary/10 border border-primary/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 w-1 h-1/2 bg-primary rounded-r-md"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-primary' : 'text-zinc-400 group-hover:text-white'
                  }`}
                />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-black/20">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            {sidebarOpen && user && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-violet-500/10 flex items-center justify-center border border-white/10 shrink-0 font-semibold text-sm text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{user.name}</span>
                  <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Collapse Toggle Handle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors shadow-lg z-50 shrink-0"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile Top Navigation + Bottom Navigation Bar */}
      <div className="flex-1 flex flex-col min-w-0 relative pb-16 md:pb-0">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-6 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {activeSection}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Semester Filter */}
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-300 transition-all select-none">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer font-bold select-none"
              >
                <option value="all" className="bg-zinc-950 text-zinc-300">All</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={String(s)} className="bg-zinc-950 text-zinc-300">
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg transition-colors hidden sm:flex items-center gap-2 border border-white/5 bg-white/[0.01]"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs text-zinc-500 pr-4">Search...</span>
              <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400 border border-white/10 leading-none">Ctrl K</kbd>
            </button>

            {/* Notification Bell with Dropdown Drawer */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationsOpen(!notificationsOpen);
                }}
                className={`p-2 rounded-lg transition-all relative ${
                  notificationsOpen
                    ? 'text-white bg-white/5 border border-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[9px] font-extrabold text-white flex items-center justify-center border border-zinc-950 shadow-lg shadow-primary/20">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-3 w-80 sm:w-96 rounded-xl border border-white/5 bg-zinc-950/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[450px]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 border border-primary/20 text-primary">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          disabled={markAllReadMutation.isPending}
                          className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {/* Notification list */}
                    <div className="overflow-y-auto divide-y divide-white/5 flex-1 max-h-[350px] custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-500 mb-3">
                            <Bell className="w-5 h-5 text-zinc-600" />
                          </div>
                          <p className="text-xs font-semibold text-zinc-400">All caught up!</p>
                          <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px] mx-auto">
                            No notifications yet. You will get alerts for assignments, exams, and habits here.
                          </p>
                        </div>
                      ) : (
                        notifications.map((n: any) => (
                          <div
                            key={n.id}
                            className={`p-3.5 flex gap-3 transition-colors relative group/item ${
                              !n.isRead ? 'bg-primary/[0.02]' : 'hover:bg-white/[0.01]'
                            }`}
                          >
                            {/* Unread indicator */}
                            {!n.isRead && (
                              <div className="absolute left-1.5 top-[22px] w-1.5 h-1.5 rounded-full bg-primary" />
                            )}

                            {/* Icon wrapper */}
                            <div className="w-7 h-7 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center shrink-0 mt-0.5">
                              {getNotificationIcon(n.title)}
                            </div>

                            {/* Text message details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-white truncate pr-4">{n.title}</p>
                                <span className="text-[9px] text-zinc-500 font-medium shrink-0 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatRelativeTime(n.createdAt)}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed break-words pr-2">
                                {n.message}
                              </p>

                              {/* Action items */}
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.02] opacity-0 group-hover/item:opacity-100 transition-opacity">
                                {!n.isRead && (
                                  <button
                                    onClick={() => markReadMutation.mutate(n.id)}
                                    disabled={markReadMutation.isPending}
                                    className="text-[9px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Mark as read</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteMutation.mutate(n.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-[9px] font-bold text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-50 ml-auto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Dismiss</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile streak indicator */}
            {user && (
              <div className="md:hidden flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 fill-orange-500" />
                <span>{user.studyStreak || 0}d</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-7xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Drawer Slide-over Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-50 md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-zinc-950 border-r border-white/5 z-50 flex flex-col p-6 md:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-violet-400 flex items-center justify-center shadow-lg">
                    <span className="font-extrabold text-white text-sm">UM</span>
                  </div>
                  <span className="font-bold text-white text-lg">UniManager</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="flex-1 space-y-1 overflow-y-auto mb-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.name;

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveSection(item.name);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'text-white bg-primary/15 border border-primary/20'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-zinc-400'}`} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Drawer Footer */}
              <div className="border-t border-white/5 pt-4">
                {user && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-white/10 text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate">{user.name}</span>
                        <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sticky Bottom Tab Bar (Quick Nav for Key features) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/70 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 z-40">
        {[
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Notes', icon: FileText },
          { name: 'Planner', icon: CalendarRange },
          { name: 'AI Assistant', icon: Sparkles },
          { name: 'Profile', icon: User }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.name;

          return (
            <button
              key={item.name}
              onClick={() => setActiveSection(item.name)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-zinc-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Global Command-Palette Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-[15%] left-[5%] right-[5%] md:left-[25%] md:right-[25%] max-w-2xl bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[550px] backdrop-blur-xl"
            >
              {/* Input Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-white/[0.01]">
                <Search className="w-5 h-5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search workspace (notes, tasks, assignments, projects)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-0 text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-sm"
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors border border-white/5 bg-white/[0.02]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results / Content area */}
              <div className="overflow-y-auto p-4 space-y-4 max-h-[400px] custom-scrollbar select-none">
                {searchLoading && (
                  <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                    <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Searching UniManager...</span>
                  </div>
                )}

                {!searchLoading && !debouncedQuery.trim() && (
                  <div className="py-12 text-center text-zinc-500">
                    <p className="text-xs font-semibold text-zinc-400">Search UniManager Workspace</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Type keywords to search notes, tasks, assignments, and board projects.</p>
                  </div>
                )}

                {!searchLoading && debouncedQuery.trim() && searchResults && (
                  (() => {
                    const hasResults = Object.values(searchResults).some((arr: any) => arr.length > 0);
                    if (!hasResults) {
                      return (
                        <div className="py-12 text-center text-zinc-500">
                          <p className="text-xs font-semibold text-zinc-400">No results found</p>
                          <p className="text-[10px] text-zinc-600 mt-1">We couldn't find matches for "{debouncedQuery}" in your workspace.</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Subjects Results */}
                        {searchResults.subjects?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Subjects</h4>
                            <div className="space-y-1.5">
                              {searchResults.subjects.map((subj: any) => (
                                <button
                                  key={subj.id}
                                  onClick={() => {
                                    localStorage.setItem('selectedSubjectId', subj.id);
                                    setActiveSection('Subjects');
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                                >
                                  <span className="font-semibold">{subj.name}</span>
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subj.color }} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes Results */}
                        {searchResults.notes?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Notes</h4>
                            <div className="space-y-1.5">
                              {searchResults.notes.map((note: any) => (
                                <button
                                  key={note.id}
                                  onClick={() => {
                                    localStorage.setItem('selectedNoteId', note.id);
                                    setActiveSection('Notes');
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                                >
                                  <span className="font-semibold block truncate pr-4">{note.title}</span>
                                  <span className="text-[9px] text-zinc-500 font-semibold shrink-0 uppercase">📝 Open Notes</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tasks Results */}
                        {searchResults.tasks?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Tasks</h4>
                            <div className="space-y-1.5">
                              {searchResults.tasks.map((task: any) => (
                                <button
                                  key={task.id}
                                  onClick={() => {
                                    if (task.date) {
                                      localStorage.setItem('selectedTaskDate', task.date);
                                    }
                                    setActiveSection('Planner');
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                                >
                                  <span className="font-semibold block truncate pr-4">{task.title}</span>
                                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-zinc-400 font-semibold shrink-0">{task.status}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assignments Results */}
                        {searchResults.assignments?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Assignments</h4>
                            <div className="space-y-1.5">
                              {searchResults.assignments.map((asg: any) => (
                                <button
                                  key={asg.id}
                                  onClick={() => {
                                    localStorage.setItem('selectedAssignmentId', asg.id);
                                    setActiveSection('Assignments');
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                                >
                                  <span className="font-semibold block truncate pr-4">{asg.title}</span>
                                  <span className="text-[9px] text-zinc-500 font-semibold shrink-0">Due {new Date(asg.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Projects Results */}
                        {searchResults.projects?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Projects</h4>
                            <div className="space-y-1.5">
                              {searchResults.projects.map((proj: any) => (
                                <button
                                  key={proj.id}
                                  onClick={() => {
                                    localStorage.setItem('selectedProjectId', proj.id);
                                    setActiveSection('Projects');
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                                >
                                  <span className="font-semibold block truncate pr-4">{proj.name}</span>
                                  <span className="text-[9px] text-zinc-500 font-semibold shrink-0">{proj.progress}% Done</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
