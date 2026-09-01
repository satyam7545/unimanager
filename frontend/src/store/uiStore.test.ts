import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  // Store original state
  const originalState = useUIStore.getState();

  beforeEach(() => {
    // Reset store before each test
    useUIStore.setState(originalState, true);

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock document.documentElement.classList
    Object.defineProperty(window.document.documentElement, 'classList', {
      writable: true,
      value: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(true);
      expect(state.activeSection).toBe('Dashboard');
      expect(state.theme).toBe('dark');
      expect(state.selectedSemester).toBe('all');
      expect(state.quickActionTrigger).toBeNull();
    });
  });

  describe('simple setters', () => {
    it('should set sidebar open state', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should toggle sidebar state', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should set active section', () => {
      useUIStore.getState().setActiveSection('Settings');
      expect(useUIStore.getState().activeSection).toBe('Settings');
    });

    it('should set selected semester', () => {
      useUIStore.getState().setSelectedSemester('Spring 2024');
      expect(useUIStore.getState().selectedSemester).toBe('Spring 2024');
    });

    it('should set quick action trigger', () => {
      useUIStore.getState().setQuickActionTrigger('task');
      expect(useUIStore.getState().quickActionTrigger).toBe('task');

      useUIStore.getState().setQuickActionTrigger(null);
      expect(useUIStore.getState().quickActionTrigger).toBeNull();
    });
  });

  describe('theme management', () => {
    it('should set light theme', () => {
      const removeSpy = vi.spyOn(window.document.documentElement.classList, 'remove');
      const addSpy = vi.spyOn(window.document.documentElement.classList, 'add');

      useUIStore.getState().setTheme('light');

      expect(removeSpy).toHaveBeenCalledWith('light', 'dark');
      expect(addSpy).toHaveBeenCalledWith('light');
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('should set dark theme', () => {
      const removeSpy = vi.spyOn(window.document.documentElement.classList, 'remove');
      const addSpy = vi.spyOn(window.document.documentElement.classList, 'add');

      useUIStore.getState().setTheme('dark');

      expect(removeSpy).toHaveBeenCalledWith('light', 'dark');
      expect(addSpy).toHaveBeenCalledWith('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should set system theme with dark mode preference', () => {
      const removeSpy = vi.spyOn(window.document.documentElement.classList, 'remove');
      const addSpy = vi.spyOn(window.document.documentElement.classList, 'add');

      // Mock prefers-color-scheme: dark to true
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
      }));

      useUIStore.getState().setTheme('system');

      expect(removeSpy).toHaveBeenCalledWith('light', 'dark');
      expect(addSpy).toHaveBeenCalledWith('dark');
      expect(useUIStore.getState().theme).toBe('system');
    });

    it('should set system theme with light mode preference', () => {
      const removeSpy = vi.spyOn(window.document.documentElement.classList, 'remove');
      const addSpy = vi.spyOn(window.document.documentElement.classList, 'add');

      // Mock prefers-color-scheme: dark to false
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
      }));

      useUIStore.getState().setTheme('system');

      expect(removeSpy).toHaveBeenCalledWith('light', 'dark');
      expect(addSpy).toHaveBeenCalledWith('light');
      expect(useUIStore.getState().theme).toBe('system');
    });
  });
});
