import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Flame, Trash2, CheckCircle2, Circle, AlertCircle, Dumbbell, Code2, Moon, Droplet } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';

// Single source of truth for icon metadata — eliminates the two parallel switch statements
const ICON_REGISTRY: Record<string, { Component: React.ElementType; colorClass: string; label: string }> = {
  Flame:   { Component: Flame,    colorClass: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'Study/Focus' },
  Code2:   { Component: Code2,    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',     label: 'Coding/Dev' },
  Dumbbell:{ Component: Dumbbell, colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', label: 'Workout/Gym' },
  Moon:    { Component: Moon,     colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', label: 'Sleep/Rest' },
  Droplet: { Component: Droplet,  colorClass: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',     label: 'Water/Hydrate' },
};

const ICON_OPTIONS = Object.entries(ICON_REGISTRY).map(([name, meta]) => ({ name, ...meta }));

export const Habits: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Flame');
  const [target, setTarget] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline delete confirmation state — no more window.confirm()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 1. Fetch habits
  const { data: habits, isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await api.get('/habits');
      return res.data.habits;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/habits', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create habit.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/habits/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/habits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setConfirmDeleteId(null);
    },
  });

  const resetForm = () => {
    setName('');
    setIcon('Flame');
    setTarget(1);
    setErrorMsg(null);
    setShowAddModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, icon, frequency: 'DAILY', target });
  };

  return (
    <div className="space-y-8 select-none">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Daily Habit Tracker</h2>
          <p className="text-sm text-zinc-400 mt-1">Consistency builds character. Log study, coding, and health targets.</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Target</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      ) : habits?.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
          <p className="text-zinc-500 text-sm">No habits configured yet. Create a daily target to begin tracking streaks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits?.map((h: any) => {
            const iconMeta = ICON_REGISTRY[h.icon] || ICON_REGISTRY['Flame'];
            const Icon = iconMeta.Component;
            const isCompleted = h.isCompletedToday;
            const isPendingDelete = confirmDeleteId === h.id;

            return (
              <GlassCard
                key={h.id}
                hoverEffect={true}
                className={`border-white/5 flex items-center justify-between gap-4 !p-4 cursor-pointer group`}
                onClick={() => !isPendingDelete && toggleMutation.mutate(h.id)}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${iconMeta.colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-sm font-bold truncate block ${isCompleted ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {h.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-orange-500 font-semibold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-orange-500 shrink-0" />
                        <span>{h.streak || 0}d streak</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle complete button */}
                  {!isPendingDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate(h.id);
                      }}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-primary fill-primary/10" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-700 hover:border-zinc-500" />
                      )}
                    </button>
                  )}

                  {/* Inline delete confirmation */}
                  {isPendingDelete ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-zinc-400 font-semibold whitespace-nowrap">Delete?</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(h.id); }}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white font-bold transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(h.id); }}
                      className="p-1 text-zinc-800 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Delete target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Create Daily Target</h3>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Target Activity</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Code for 1 hour"
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Daily Target Count</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Icon Scope</label>
                <div className="grid grid-cols-5 gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const OptIcon = opt.Component;
                    const isSelected = icon === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setIcon(opt.name)}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary scale-105'
                            : 'border-white/5 bg-white/[0.01] text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={opt.label}
                      >
                        <OptIcon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-10 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
