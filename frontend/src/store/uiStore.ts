import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  activeSection: string;
  theme: 'dark' | 'light' | 'system';
  selectedSemester: string;
  quickActionTrigger: 'note' | 'task' | 'assignment' | 'event' | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveSection: (section: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setSelectedSemester: (semester: string) => void;
  setQuickActionTrigger: (trigger: 'note' | 'task' | 'assignment' | 'event' | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeSection: 'Dashboard',
      theme: 'dark',
      selectedSemester: 'all',
      quickActionTrigger: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveSection: (section) => set({ activeSection: section }),
      setTheme: (theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }

        set({ theme });
      },
      setSelectedSemester: (semester) => set({ selectedSemester: semester }),
      setQuickActionTrigger: (trigger) => set({ quickActionTrigger: trigger }),
    }),
    {
      name: 'unimanager-ui-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        activeSection: state.activeSection,
        selectedSemester: state.selectedSemester,
      }),
    }
  )
);
