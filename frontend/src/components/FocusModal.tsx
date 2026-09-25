import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/services/api';

export const FocusModal: React.FC = () => {
  const queryClient = useQueryClient();
  const { focusTask, setFocusTask } = useUIStore();

  const [selectedDuration, setSelectedDuration] = useState<number>(() => {
    return (focusTask?.estimatedMinutes || 25) * 60;
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(selectedDuration);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState<boolean>(false);
  const [activeNoteContent, setActiveNoteContent] = useState<any | null>(null);
  const [showReflection, setShowReflection] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (focusTask) {
      const initialSecs = (focusTask.estimatedMinutes || 25) * 60;
      setSelectedDuration(initialSecs);
      setSecondsLeft(initialSecs);
      setIsRunning(true);
      setElapsedSeconds(0);
      setShowReflection(false);
      setNotesDrawerOpen(false);
    }
  }, [focusTask]);

  // Audio chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();
            setShowReflection(true);
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, soundEnabled]);

  // Fetch subject notes if subjectId is provided
  const { data: subjectNotes = [] } = useQuery({
    queryKey: ['focusSubjectNotes', focusTask?.subjectId],
    queryFn: async () => {
      if (!focusTask?.subjectId) {
        const res = await api.get('/notes');
        return res.data?.notes || [];
      }
      const res = await api.get(`/notes?subjectId=${focusTask.subjectId}`);
      return res.data?.notes || [];
    },
    enabled: !!focusTask,
  });

  // Complete session mutation
  const completeMutation = useMutation({
    mutationFn: async ({ status }: { status: 'DONE' | 'IN_PROGRESS' }) => {
      if (!focusTask) return;
      const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      return api.post(`/tasks/${focusTask.id}/focus-complete`, {
        actualMinutes,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setFocusTask(null);
    },
  });

  if (!focusTask) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.min(100, Math.round(((selectedDuration - secondsLeft) / selectedDuration) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: focusTask.subjectColor || '#8B5CF6' }} />
              <div>
                <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">
                  {focusTask.subjectName || 'Focus Session'}
                </span>
                <h3 className="text-base font-bold text-white truncate max-w-md">{focusTask.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
                title={soundEnabled ? 'Mute chime' : 'Enable chime'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setNotesDrawerOpen(!notesDrawerOpen)}
                className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  notesDrawerOpen
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="View linked subject notes"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Notes</span>
              </button>
              <button
                onClick={() => setFocusTask(null)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 md:p-8 flex flex-col items-center justify-center flex-1 relative overflow-y-auto">
            {!showReflection ? (
              <div className="flex flex-col items-center text-center w-full">
                {/* Circular timer / digit representation */}
                <div className="relative w-56 h-56 flex items-center justify-center mb-6">
                  {/* Background track */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-zinc-800"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      stroke={focusTask.subjectColor || '#8B5CF6'}
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={276.46}
                      strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-white">
                      {formattedTime}
                    </span>
                    <span className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {isRunning ? 'Deep Focus' : 'Paused'}
                    </span>
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="flex items-center gap-2 mb-6">
                  {[15, 25, 45, 60].map((mins) => {
                    const sec = mins * 60;
                    const isSelected = selectedDuration === sec;
                    return (
                      <button
                        key={mins}
                        onClick={() => {
                          setSelectedDuration(sec);
                          setSecondsLeft(sec);
                          setIsRunning(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-white/15 text-white border border-white/20'
                            : 'text-zinc-400 hover:text-white bg-white/5 border border-white/5'
                        }`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => {
                      setSecondsLeft(selectedDuration);
                      setIsRunning(false);
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition"
                  >
                    {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                  </button>

                  <button
                    onClick={() => setShowReflection(true)}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                    title="Finish Session"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-zinc-500 max-w-sm">
                  Focus on one deliverable without multitasking. When the session ends, record your reflection.
                </p>
              </div>
            ) : (
              /* Post-Session Reflection Dialog */
              <div className="w-full max-w-md text-center py-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Session Complete!</h3>
                <p className="text-xs text-zinc-400 mb-6">
                  You focused for {Math.max(1, Math.round(elapsedSeconds / 60))} minutes on{' '}
                  <span className="text-white font-semibold">"{focusTask.title}"</span>. How did it go?
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => completeMutation.mutate({ status: 'DONE' })}
                    disabled={completeMutation.isPending}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-sm flex items-center justify-between transition"
                  >
                    <span>✅ Task Completed Fully</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => completeMutation.mutate({ status: 'IN_PROGRESS' })}
                    disabled={completeMutation.isPending}
                    className="w-full py-3 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 font-semibold text-sm flex items-center justify-between transition"
                  >
                    <span>⚡ Partially Done (Keep In Progress)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setFocusTask(null)}
                    className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
                  >
                    Dismiss without marking
                  </button>
                </div>
              </div>
            )}

            {/* Notes Drawer Slide-over */}
            <AnimatePresence>
              {notesDrawerOpen && (
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-y-0 right-0 w-full md:w-80 bg-zinc-900 border-l border-white/10 p-4 shadow-xl z-20 flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      Subject Notes
                    </h4>
                    <button
                      onClick={() => {
                        setNotesDrawerOpen(false);
                        setActiveNoteContent(null);
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!activeNoteContent ? (
                    <div className="flex-1 overflow-y-auto py-2 space-y-2">
                      {subjectNotes.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-xs">
                          No notes found for this subject yet.
                        </div>
                      ) : (
                        subjectNotes.map((n: any) => (
                          <div
                            key={n.id}
                            onClick={() => setActiveNoteContent(n)}
                            className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition text-left"
                          >
                            <h5 className="text-xs font-semibold text-white truncate">{n.title}</h5>
                            <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">
                              {n.content?.replace(/<[^>]*>?/gm, '') || 'No text'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto py-2 flex flex-col">
                      <button
                        onClick={() => setActiveNoteContent(null)}
                        className="text-[11px] text-primary hover:underline mb-2 flex items-center gap-1 text-left"
                      >
                        ← Back to notes list
                      </button>
                      <h4 className="text-sm font-bold text-white mb-2">{activeNoteContent.title}</h4>
                      <div
                        className="text-xs text-zinc-300 leading-relaxed overflow-y-auto flex-1 pr-1 prose prose-invert max-w-none text-left"
                        dangerouslySetInnerHTML={{ __html: activeNoteContent.content }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
