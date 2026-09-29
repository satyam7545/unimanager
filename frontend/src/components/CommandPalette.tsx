import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  FileText,
  ClipboardList,
  CalendarDays,
  ArrowRight,
  Sparkles,
  X,
  Plus,
  Timer,
  LayoutDashboard,
  CalendarRange,
  Flame,
  BarChart3,
  CornerDownLeft,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveSection,
    setFocusTask,
    setQuickCaptureOpen,
    setSelectedSemester,
  } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input and reset on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['universalSearch', query],
    queryFn: async () => {
      if (!query.trim() || query.startsWith('>')) return null;
      const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
      return res.data;
    },
    enabled: query.trim().length > 0 && !query.startsWith('>') && commandPaletteOpen,
  });

  // Fetch subjects to match natural language quick-add
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjectsListQuickAdd'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data?.subjects || [];
    },
    enabled: commandPaletteOpen,
  });

  // Smart natural language parser
  const parseNaturalInput = (text: string) => {
    const lower = text.toLowerCase();
    if (!lower.trim() || text.startsWith('>')) return null;

    const matchedSubject = subjects.find((s: any) =>
      lower.includes(s.name.toLowerCase())
    );

    let type: 'ASSIGNMENT' | 'TASK' | 'EVENT' = 'TASK';
    if (lower.includes('assignment') || lower.includes('hw') || lower.includes('homework') || lower.includes('project')) {
      type = 'ASSIGNMENT';
    } else if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final') || lower.includes('quiz') || lower.includes('lecture') || lower.includes('class')) {
      type = 'EVENT';
    }

    let targetDate = new Date();
    let dateLabel = 'Today';

    if (lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
      dateLabel = 'Tomorrow';
    } else if (lower.includes('friday')) {
      const daysUntilFri = (5 - targetDate.getDay() + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilFri);
      dateLabel = 'This Friday';
    } else if (lower.includes('monday')) {
      const daysUntilMon = (1 - targetDate.getDay() + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilMon);
      dateLabel = 'Next Monday';
    }

    let cleanTitle = text
      .replace(/tomorrow|friday|monday|today/gi, '')
      .replace(/assignment|hw|homework|project|exam|quiz|lecture/gi, '')
      .trim();

    if (matchedSubject) {
      cleanTitle = cleanTitle.replace(new RegExp(matchedSubject.name, 'gi'), '').trim();
    }

    if (!cleanTitle) cleanTitle = `${type === 'ASSIGNMENT' ? 'Assignment' : type === 'EVENT' ? 'Exam' : 'Task'}`;

    return {
      title: cleanTitle,
      type,
      subject: matchedSubject || null,
      targetDate,
      dateLabel,
    };
  };

  const parsedIntent = parseNaturalInput(query);

  const createMutation = useMutation({
    mutationFn: async (parsed: any) => {
      if (parsed.type === 'ASSIGNMENT') {
        return api.post('/assignments', {
          title: parsed.title,
          deadline: parsed.targetDate.toISOString(),
          priority: 'MEDIUM',
          subjectId: parsed.subject?.id || null,
        });
      } else if (parsed.type === 'EVENT') {
        return api.post('/events', {
          title: parsed.title,
          startAt: parsed.targetDate.toISOString(),
          endAt: new Date(parsed.targetDate.getTime() + 3600000).toISOString(),
          eventType: 'EXAM',
          subjectId: parsed.subject?.id || null,
        });
      } else {
        return api.post('/tasks', {
          title: parsed.title,
          status: 'TODO',
          priority: 'MEDIUM',
          timeSlot: 'AFTERNOON',
          date: parsed.targetDate.toISOString(),
          subjectId: parsed.subject?.id || null,
          estimatedMinutes: 30,
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setCommandPaletteOpen(false);

      if (vars?.type === 'ASSIGNMENT') navigate('/assignments');
      else if (vars?.type === 'EVENT') navigate('/calendar');
      else navigate('/planner');
    },
  });

  // Action Commands
  const commandActions = [
    {
      id: 'cmd-quick-capture',
      label: 'Quick Capture (Note, Task, or Coursework)',
      sublabel: 'Floating instant modal without leaving view',
      category: 'Actions',
      icon: Plus,
      badge: 'Alt+N',
      action: () => {
        setCommandPaletteOpen(false);
        setQuickCaptureOpen(true);
      },
    },
    {
      id: 'cmd-new-note',
      label: 'New Note',
      sublabel: 'Write lecture markdown notes',
      category: 'Actions',
      icon: FileText,
      badge: 'Action',
      action: () => {
        navigate('/notes');
        setActiveSection('Notes');
        setCommandPaletteOpen(false);
        setQuickCaptureOpen(true);
      },
    },
    {
      id: 'cmd-new-task',
      label: 'New Task',
      sublabel: 'Add to morning, afternoon, or night schedule',
      category: 'Actions',
      icon: ClipboardList,
      badge: 'Action',
      action: () => {
        navigate('/planner');
        setActiveSection('Planner');
        setCommandPaletteOpen(false);
        setQuickCaptureOpen(true);
      },
    },
    {
      id: 'cmd-focus-mode',
      label: 'Start Focus Timer / Study Mode',
      sublabel: 'Launch 25-minute Pomodoro focus session',
      category: 'Actions',
      icon: Timer,
      badge: 'Pomodoro',
      action: () => {
        setFocusTask({
          id: 'focus-session',
          title: 'Deep Study Session',
          estimatedMinutes: 25,
        });
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-dashboard',
      label: 'Go to Dashboard',
      sublabel: 'Progress, streak, and priorities summary',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        navigate('/dashboard');
        setActiveSection('Dashboard');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-planner',
      label: 'Go to Planner',
      sublabel: 'Day schedule & task allocation',
      category: 'Navigation',
      icon: CalendarRange,
      action: () => {
        navigate('/planner');
        setActiveSection('Planner');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-subjects',
      label: 'Go to Course Subjects',
      sublabel: 'Course syllabus, notes, and milestones',
      category: 'Navigation',
      icon: BookOpen,
      action: () => {
        navigate('/subjects');
        setActiveSection('Subjects');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-assignments',
      label: 'Go to Assignments',
      sublabel: 'Upcoming homework and lab submissions',
      category: 'Navigation',
      icon: ClipboardList,
      action: () => {
        navigate('/assignments');
        setActiveSection('Assignments');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-calendar',
      label: 'Go to Academic Calendar',
      sublabel: 'Exams, milestones, and timetable schedule',
      category: 'Navigation',
      icon: CalendarDays,
      action: () => {
        navigate('/calendar');
        setActiveSection('Calendar');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-habits',
      label: 'Go to Habit Tracker',
      sublabel: 'Daily streak and routine tracking',
      category: 'Navigation',
      icon: Flame,
      action: () => {
        navigate('/habits');
        setActiveSection('Habits');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-analytics',
      label: 'Go to Analytics',
      sublabel: 'Academic performance and completion velocity',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        navigate('/analytics');
        setActiveSection('Analytics');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-nav-ai',
      label: 'Ask AI Study Assistant',
      sublabel: 'Concept explainers, study plans, quiz generator',
      category: 'Navigation',
      icon: Sparkles,
      badge: 'AI',
      action: () => {
        navigate('/ai');
        setActiveSection('AI Assistant');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-switch-sem-all',
      label: 'Switch Semester: All Semesters',
      sublabel: 'View coursework across all terms',
      category: 'Preferences',
      icon: BookOpen,
      action: () => {
        setSelectedSemester('all');
        setCommandPaletteOpen(false);
      },
    },
  ];

  // Build unified items array for keyboard navigation
  const isCommandMode = query.startsWith('>');
  const cleanQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

  const matchingCommands = commandActions.filter((cmd) => {
    if (!cleanQuery) return true;
    return (
      cmd.label.toLowerCase().includes(cleanQuery) ||
      cmd.sublabel?.toLowerCase().includes(cleanQuery)
    );
  });

  const matchingNotes = (searchResults?.notes || []).map((n: any) => ({
    id: `note-${n.id}`,
    label: n.title,
    sublabel: n.subject?.name ? `Note in ${n.subject.name}` : 'Study Note',
    category: 'Notes',
    icon: FileText,
    badge: n.subject?.name || 'Note',
    badgeColor: n.subject?.color,
    action: () => {
      navigate(`/notes/${n.id}`);
      setActiveSection('Notes');
      setCommandPaletteOpen(false);
    },
  }));

  const matchingTasks = (searchResults?.tasks || []).map((t: any) => ({
    id: `task-${t.id}`,
    label: t.title,
    sublabel: `Task · ${t.status}`,
    category: 'Tasks',
    icon: ClipboardList,
    badge: 'Focus',
    action: () => {
      setFocusTask({
        id: t.id,
        title: t.title,
        subjectName: t.subject?.name,
        subjectColor: t.subject?.color,
        subjectId: t.subject?.id,
      });
      setCommandPaletteOpen(false);
    },
  }));

  const matchingAssignments = (searchResults?.assignments || []).map((a: any) => ({
    id: `ass-${a.id}`,
    label: a.title,
    sublabel: `Due ${new Date(a.deadline).toLocaleDateString()}`,
    category: 'Assignments',
    icon: ClipboardList,
    badge: a.priority,
    action: () => {
      navigate('/assignments');
      setActiveSection('Assignments');
      setCommandPaletteOpen(false);
    },
  }));

  const matchingEvents = (searchResults?.events || []).map((e: any) => ({
    id: `event-${e.id}`,
    label: e.title,
    sublabel: `${e.eventType || 'Event'} · ${new Date(e.startAt).toLocaleDateString()}`,
    category: 'Calendar',
    icon: CalendarDays,
    badge: e.eventType,
    action: () => {
      navigate('/calendar');
      setActiveSection('Calendar');
      setCommandPaletteOpen(false);
    },
  }));

  const matchingSubjects = (searchResults?.subjects || []).map((s: any) => ({
    id: `sub-${s.id}`,
    label: s.name,
    sublabel: s.semester ? `Semester ${s.semester}` : 'Subject Course Hub',
    category: 'Subjects',
    icon: BookOpen,
    badge: 'Course',
    badgeColor: s.color,
    action: () => {
      navigate(`/subjects/${s.id}`);
      setActiveSection('Subjects');
      setCommandPaletteOpen(false);
    },
  }));

  const unifiedList = isCommandMode
    ? matchingCommands
    : query.trim()
    ? [
        ...matchingNotes,
        ...matchingTasks,
        ...matchingAssignments,
        ...matchingEvents,
        ...matchingSubjects,
        ...matchingCommands.filter((c) => c.category === 'Actions'),
      ]
    : matchingCommands;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (unifiedList.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % unifiedList.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (unifiedList.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + unifiedList.length) % unifiedList.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (parsedIntent && selectedIndex === 0 && !isCommandMode) {
        createMutation.mutate(parsedIntent);
      } else if (unifiedList[selectedIndex]) {
        unifiedList[selectedIndex].action();
      }
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-md"
        onClick={() => setCommandPaletteOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="w-full max-w-xl bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Bar */}
          <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search anything or type '> focus' for commands..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 rounded">
              ESC
            </kbd>
          </div>

          {/* Body Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Interpreted Natural Language Quick-Add Preview */}
            {parsedIntent && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Smart Quick-Add Detected
                  </span>
                  <span className="text-[10px] text-zinc-400">Press Enter to Create</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{parsedIntent.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-300">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider">
                        {parsedIntent.type}
                      </span>
                      {parsedIntent.subject && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${parsedIntent.subject.color}20`,
                            color: parsedIntent.subject.color,
                          }}
                        >
                          {parsedIntent.subject.name}
                        </span>
                      )}
                      <span>· Due {parsedIntent.dateLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => createMutation.mutate(parsedIntent)}
                    disabled={createMutation.isPending}
                    className="shrink-0 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-primary/30 transition"
                  >
                    <span>Create</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Unified Search & Action Results */}
            {isSearching ? (
              <div className="py-12 text-center text-xs text-zinc-500">Searching workspace...</div>
            ) : unifiedList.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                No matching results or commands found for "{query}".
              </div>
            ) : (
              <div className="space-y-1">
                {unifiedList.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => item.action()}
                      className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-primary/20 border border-primary/40 text-white shadow-sm shadow-primary/10'
                          : 'border border-transparent hover:bg-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-primary text-white border-primary/40'
                              : 'bg-white/5 border-white/10 text-zinc-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-white">{item.label}</p>
                          {item.sublabel && (
                            <p className="text-[10px] text-zinc-500 truncate">{item.sublabel}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                            style={
                              item.badgeColor
                                ? { backgroundColor: `${item.badgeColor}20`, color: item.badgeColor }
                                : { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#d4d4d8' }
                            }
                          >
                            {item.badge}
                          </span>
                        )}
                        {isSelected && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Shortcuts Navigation Bar */}
          <div className="p-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
                  ↓
                </kbd>
                <span className="ml-0.5">navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
                  ↵
                </kbd>
                <span className="ml-0.5">select</span>
              </span>
            </div>

            <div className="text-[10px] text-zinc-600 hidden sm:block">
              Type <span className="font-mono text-zinc-400">&gt;</span> for quick actions
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
