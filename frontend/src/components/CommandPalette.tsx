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
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/services/api';

export const CommandPalette: React.FC = () => {
  const queryClient = useQueryClient();
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveSection, setFocusTask } = useUIStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

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
      if (!query.trim()) return null;
      const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
      return res.data;
    },
    enabled: query.trim().length > 0 && commandPaletteOpen,
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
    if (!lower.trim()) return null;

    // Match subject from existing user subjects
    const matchedSubject = subjects.find((s: any) =>
      lower.includes(s.name.toLowerCase())
    );

    // Check entity type intent
    let type: 'ASSIGNMENT' | 'TASK' | 'EVENT' = 'TASK';
    if (lower.includes('assignment') || lower.includes('hw') || lower.includes('homework') || lower.includes('project')) {
      type = 'ASSIGNMENT';
    } else if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final') || lower.includes('quiz') || lower.includes('lecture') || lower.includes('class')) {
      type = 'EVENT';
    }

    // Attempt simple date inference
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
    } else if (lower.includes('next week')) {
      targetDate.setDate(targetDate.getDate() + 7);
      dateLabel = 'Next Week';
    }

    // Clean title
    let title = text
      .replace(/(due|on|tomorrow|friday|monday|next week|at|assignment|task|exam)/gi, '')
      .trim();
    if (!title) title = text;

    return {
      type,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      subject: matchedSubject || null,
      targetDate,
      dateLabel,
    };
  };

  const parsedIntent = query.trim().length > 3 ? parseNaturalInput(query) : null;

  // Quick creation mutation
  const createMutation = useMutation({
    mutationFn: async (parsed: ReturnType<typeof parseNaturalInput>) => {
      if (!parsed) return;

      if (parsed.type === 'ASSIGNMENT') {
        return api.post('/assignments', {
          title: parsed.title,
          deadline: parsed.targetDate.toISOString(),
          priority: 'MEDIUM',
          subjectId: parsed.subject?.id || null,
          estimatedHours: 2.0,
        });
      } else if (parsed.type === 'EVENT') {
        const startAt = new Date(parsed.targetDate);
        startAt.setHours(10, 0, 0, 0);
        const endAt = new Date(startAt);
        endAt.setHours(11, 30, 0, 0);
        return api.post('/events', {
          title: parsed.title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          isAllDay: false,
          subjectId: parsed.subject?.id || null,
          eventType: parsed.title.toLowerCase().includes('exam') ? 'EXAM' : 'EVENT',
        });
      } else {
        // Default Task
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

      if (vars?.type === 'ASSIGNMENT') setActiveSection('Assignments');
      else if (vars?.type === 'EVENT') setActiveSection('Calendar');
      else setActiveSection('Planner');
    },
  });

  if (!commandPaletteOpen) return null;

  const hasResults =
    searchResults &&
    (searchResults.notes?.length > 0 ||
      searchResults.tasks?.length > 0 ||
      searchResults.assignments?.length > 0 ||
      searchResults.events?.length > 0 ||
      searchResults.subjects?.length > 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Search Input Bar */}
          <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-zinc-900/40">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything or type 'DBMS assignment due Friday'..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 rounded text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 rounded">
              ESC
            </kbd>
          </div>

          {/* Body Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Interpreted Natural Language Quick-Add Preview */}
            {parsedIntent && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Smart Quick-Add Detected
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Interpreted Intent
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {parsedIntent.title}
                    </p>
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

            {/* Live Universal Search Results */}
            {query.trim().length > 0 ? (
              isSearching ? (
                <div className="py-12 text-center text-xs text-zinc-500">Searching workspace...</div>
              ) : hasResults ? (
                <div className="space-y-4">
                  {/* Notes Results */}
                  {searchResults.notes?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                        Study Notes ({searchResults.notes.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.notes.map((n: any) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setActiveSection('Notes');
                              setCommandPaletteOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between group transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs font-semibold text-white truncate">{n.title}</span>
                              {n.subject && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium"
                                  style={{
                                    backgroundColor: `${n.subject.color}20`,
                                    color: n.subject.color,
                                  }}
                                >
                                  {n.subject.name}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 group-hover:text-primary transition">
                              Open →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks Results */}
                  {searchResults.tasks?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                        Planner Tasks ({searchResults.tasks.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.tasks.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setFocusTask({
                                id: t.id,
                                title: t.title,
                                subjectName: t.subject?.name,
                                subjectColor: t.subject?.color,
                                subjectId: t.subject?.id,
                              });
                              setCommandPaletteOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between group transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="text-xs font-semibold text-white truncate">{t.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                                {t.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 group-hover:text-amber-400 transition">
                              Focus Session →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignments Results */}
                  {searchResults.assignments?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                        Assignments ({searchResults.assignments.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.assignments.map((a: any) => (
                          <div
                            key={a.id}
                            onClick={() => {
                              setActiveSection('Assignments');
                              setCommandPaletteOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between group transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ClipboardList className="w-4 h-4 text-sky-400 shrink-0" />
                              <span className="text-xs font-semibold text-white truncate">{a.title}</span>
                              {a.subject && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium"
                                  style={{
                                    backgroundColor: `${a.subject.color}20`,
                                    color: a.subject.color,
                                  }}
                                >
                                  {a.subject.name}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 group-hover:text-sky-400 transition">
                              View →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Events / Exams Results */}
                  {searchResults.events?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                        Calendar Events & Exams ({searchResults.events.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.events.map((e: any) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              setActiveSection('Calendar');
                              setCommandPaletteOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between group transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-xs font-semibold text-white truncate">{e.title}</span>
                              {e.eventType && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                                  {e.eventType}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 group-hover:text-emerald-400 transition">
                              Calendar →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subjects Results */}
                  {searchResults.subjects?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                        Subjects ({searchResults.subjects.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.subjects.map((s: any) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setActiveSection('Subjects');
                              setCommandPaletteOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between group transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />
                              <span className="text-xs font-semibold text-white truncate">{s.name}</span>
                              {s.semester && (
                                <span className="text-[10px] text-zinc-500">Semester {s.semester}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 group-hover:text-violet-400 transition">
                              Course Hub →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No exact matches found for "{query}". You can still create it using the Smart Quick-Add above.
                </div>
              )
            ) : (
              /* Default Quick Suggestions */
              <div className="py-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Quick Navigation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Today’s Dashboard', icon: FileText, sec: 'Dashboard' },
                    { label: 'Course Subjects', icon: BookOpen, sec: 'Subjects' },
                    { label: 'Upcoming Assignments', icon: ClipboardList, sec: 'Assignments' },
                    { label: 'Academic Calendar', icon: CalendarDays, sec: 'Calendar' },
                  ].map((item) => (
                    <button
                      key={item.sec}
                      onClick={() => {
                        setActiveSection(item.sec);
                        setCommandPaletteOpen(false);
                      }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left flex items-center gap-2.5 transition"
                    >
                      <item.icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-zinc-300">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 text-[11px] text-zinc-500 text-center">
                  Tip: Type naturally like <span className="text-zinc-300 font-mono">"OS assignment due Friday"</span> to quickly capture work.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
