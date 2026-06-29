import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';
import { useUIStore } from '@/store/uiStore';

// Slot display metadata — emoji + readable label
const SLOT_META: Record<string, { emoji: string; label: string }> = {
  MORNING:   { emoji: '🌅', label: 'Morning' },
  AFTERNOON: { emoji: '☀️', label: 'Afternoon' },
  NIGHT:     { emoji: '🌙', label: 'Night' },
};

export const Planner: React.FC = () => {
  const queryClient = useQueryClient();
  const { quickActionTrigger, setQuickActionTrigger } = useUIStore();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Inline input states per column
  const [inputs, setInputs] = useState<Record<string, string>>({
    MORNING: '',
    AFTERNOON: '',
    NIGHT: '',
  });

  // Inline delete confirmation — replaces window.confirm()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Deep-link redirect handler from search
  React.useEffect(() => {
    const redirectedTaskDateStr = localStorage.getItem('selectedTaskDate');
    if (redirectedTaskDateStr) {
      const parsedDate = new Date(redirectedTaskDateStr);
      parsedDate.setHours(0, 0, 0, 0);
      setSelectedDate(parsedDate);
      localStorage.removeItem('selectedTaskDate');
    }
  }, []);

  React.useEffect(() => {
    if (quickActionTrigger === 'task') {
      setTimeout(() => {
        const el = document.getElementById('morning-task-input');
        if (el) {
          (el as HTMLInputElement).focus();
        }
      }, 50);
      setQuickActionTrigger(null);
    }
  }, [quickActionTrigger]);

  // Format active date to ISO query formats (YYYY-MM-DD)
  const getISOQueryDate = (d: Date) => {
    return d.toISOString().slice(0, 10);
  };

  const getStartEndRange = (d: Date) => {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  // 1. Fetch tasks for selected date
  const { start, end } = getStartEndRange(selectedDate);
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['plannerTasks', getISOQueryDate(selectedDate)],
    queryFn: async () => {
      const res = await api.get(`/tasks?dateStart=${start}&dateEnd=${end}`);
      return res.data.tasks;
    },
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannerTasks', getISOQueryDate(selectedDate)] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannerTasks', getISOQueryDate(selectedDate)] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannerTasks', getISOQueryDate(selectedDate)] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleShiftDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleGoToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  };

  const handleInputChange = (slot: string, val: string) => {
    setInputs((prev) => ({ ...prev, [slot]: val }));
  };

  const handleCreateTask = (e: React.FormEvent, slot: 'MORNING' | 'AFTERNOON' | 'NIGHT') => {
    e.preventDefault();
    const title = inputs[slot]?.trim();
    if (!title) return;

    createTaskMutation.mutate({
      title,
      timeSlot: slot,
      date: selectedDate.toISOString(),
      priority: 'MEDIUM',
      status: 'TODO',
    });

    setInputs((prev) => ({ ...prev, [slot]: '' }));
  };

  const handleToggleTask = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    updateTaskMutation.mutate({ id, data: { status: nextStatus } });
  };

  const handleDeleteTask = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTaskMutation.mutate(id);
    setConfirmDeleteId(null);
  };

  // Completion stats calculations
  const totalTasksCount = tasks?.length || 0;
  const completedTasksCount = tasks?.filter((t: any) => t.status === 'DONE').length || 0;
  const completionRatio = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-8 select-none">
      {/* Date Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleShiftDate(-1)}
            className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 justify-center sm:justify-start">
              <Calendar className="w-5 h-5 text-primary" />
              <span>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Day scheduler slot allocation</p>
          </div>

          <button
            onClick={() => handleShiftDate(1)}
            className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleGoToToday}
          className="h-10 px-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-white font-semibold text-sm transition-all"
        >
          Go To Today
        </button>
      </div>

      {/* Completion Tracker Bar */}
      <div className="p-4 border border-white/5 bg-zinc-950/20 backdrop-blur-md rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="shrink-0">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Day Progress Indicators</span>
          <h3 className="text-sm font-bold text-white mt-1">
            {completedTasksCount} of {totalTasksCount} tasks completed ({completionRatio}%)
          </h3>
        </div>

        {/* Progress slide gauge */}
        <div className="flex-1 max-w-lg w-full h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
          <div
            style={{ width: `${completionRatio}%` }}
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary to-violet-400 transition-all duration-500"
          />
        </div>
      </div>

      {/* Slots grid columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['MORNING', 'AFTERNOON', 'NIGHT'] as const).map((slot) => {
          const list = tasks?.filter((t: any) => t.timeSlot === slot) || [];
          const slotGlow = slot === 'MORNING' ? 'hover:shadow-amber-500/5' : slot === 'AFTERNOON' ? 'hover:shadow-blue-500/5' : 'hover:shadow-violet-500/5';

          const slotMeta = SLOT_META[slot];

          return (
            <div key={slot} className="flex flex-col h-[55vh] space-y-4">
              {/* Column title */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                <span className="font-bold text-sm text-zinc-300 tracking-wide">{slotMeta.emoji} {slotMeta.label}</span>
                <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-semibold">{list.length}</span>
              </div>

              {/* Inline task adder */}
              <form onSubmit={(e) => handleCreateTask(e, slot)} className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  id={slot === 'MORNING' ? 'morning-task-input' : undefined}
                  value={inputs[slot]}
                  onChange={(e) => handleInputChange(slot, e.target.value)}
                  placeholder="Quick add task..."
                  className="flex-1 h-9 px-3 rounded-lg text-xs text-white glass-input"
                />
                <button
                  type="submit"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/95 text-white transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Tasks list loop */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
                  </div>
                ) : list.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2">No tasks scheduled.</p>
                ) : (
                  list.map((task: any) => {
                    const isDone = task.status === 'DONE';

                    return (
                      <GlassCard
                        key={task.id}
                        hoverEffect={true}
                        className={`border-white/5 !p-3 flex items-start gap-2.5 group transition-shadow ${slotGlow}`}
                      >
                        <button
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className="mt-0.5 text-zinc-500 hover:text-white transition-colors shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-600 hover:border-zinc-400" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-semibold block leading-tight truncate ${
                            isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'
                          }`}>
                            {task.title}
                          </span>
                        </div>

                        {confirmDeleteId === task.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleConfirmDelete(task.id, e)}
                              className="px-1.5 py-0.5 text-[9px] rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white font-bold transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded shrink-0"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </GlassCard>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
