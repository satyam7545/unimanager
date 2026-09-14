import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '../features/auth/store/authStore';
import { GlassCard } from '@/components/GlassCard';
import { useUIStore } from '@/store/uiStore';

const EMPTY_DAYS = [
  { day: 'Mon', hrs: 0 },
  { day: 'Tue', hrs: 0 },
  { day: 'Wed', hrs: 0 },
  { day: 'Thu', hrs: 0 },
  { day: 'Fri', hrs: 0 },
  { day: 'Sat', hrs: 0 },
  { day: 'Sun', hrs: 0 },
];

interface BarChartProps {
  dailyStudyHours: { day: string; hrs: number }[];
}

const StudyBarChart: React.FC<BarChartProps> = ({ dailyStudyHours }) => {
  const bars = dailyStudyHours.length === 0 ? EMPTY_DAYS : dailyStudyHours;
  const maxHrs = dailyStudyHours.length === 0 ? 1 : Math.max(...dailyStudyHours.map((d) => d.hrs), 1);

  return (
    <div className="h-44 flex items-end justify-between gap-2.5 pt-4">
      {bars.map((bar) => {
        const heightPercent = `${Math.max(6, Math.round((bar.hrs / maxHrs) * 85))}%`;
        return (
          <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <span className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-mono">
              {bar.hrs}h
            </span>
            <div
              style={{ height: heightPercent }}
              className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t transition-all duration-300 group-hover:brightness-125 shadow-lg shadow-primary/10"
            />
            <span className="text-xs text-zinc-500">{bar.day}</span>
          </div>
        );
      })}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedSemester, setActiveSection, setFocusTask } = useUIStore();

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prioritized' | 'today' | 'deadlines'>('prioritized');

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary', selectedSemester],
    queryFn: async () => {
      let url = '/dashboard';
      if (selectedSemester && selectedSemester !== 'all') {
        url += `?semester=${selectedSemester}`;
      }
      const res = await api.get(url);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Reschedule mutation for overdue items
  const rescheduleMutation = useMutation({
    mutationFn: async ({ taskId, date }: { taskId: string; date: string }) => {
      return api.post(`/tasks/${taskId}/reschedule`, { date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return api.put(`/tasks/${taskId}`, { status: 'DONE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 select-none">
        <div className="h-8 w-64 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center border border-red-500/20 bg-red-500/5 rounded-2xl">
        <h3 className="text-red-400 font-bold text-lg">Error loading your dashboard</h3>
        <p className="text-xs text-zinc-400 mt-1">Please ensure the UniManager backend is connected.</p>
      </div>
    );
  }

  const {
    studyStreak = 0,
    todaysTasks = [],
    prioritizedTasks = [],
    upcomingAssignments = [],
    upcomingExams = [],
    todaysClasses = [],
    whatToWorkOnNow = null,
    semesterHealth = [],
    workloadMetrics = null,
    overdueItems = [],
    studyHoursTrend = 0,
    dailyStudyHours = [],
    habitStats = [],
  } = summary || {};

  return (
    <div className="space-y-6 select-none pb-12">
      {/* 1. Daily Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Good day, {user?.name || 'Student'}
            </h2>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
              <Flame className="w-3.5 h-3.5 fill-orange-400" />
              <span>{studyStreak}d streak</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
            {todaysClasses.length > 0 ? `${todaysClasses.length} classes today` : 'No classes scheduled today'} ·{' '}
            {prioritizedTasks.length} action items
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveSection('Planner')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 transition"
          >
            Open Planner
          </button>
          <button
            onClick={() => {
              if (whatToWorkOnNow?.taskId) {
                setFocusTask({
                  id: whatToWorkOnNow.taskId,
                  title: whatToWorkOnNow.title,
                  subjectName: whatToWorkOnNow.subjectName,
                  subjectColor: whatToWorkOnNow.subjectColor,
                  subjectId: whatToWorkOnNow.subjectId,
                  estimatedMinutes: whatToWorkOnNow.recommendedMinutes,
                });
              } else if (prioritizedTasks[0]) {
                setFocusTask({
                  id: prioritizedTasks[0].id,
                  title: prioritizedTasks[0].title,
                  subjectName: prioritizedTasks[0].subject?.name,
                  subjectColor: prioritizedTasks[0].subject?.color,
                  subjectId: prioritizedTasks[0].subjectId,
                  estimatedMinutes: prioritizedTasks[0].estimatedMinutes || 25,
                });
              }
            }}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white text-xs font-bold shadow-md shadow-primary/25 hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Focus Now</span>
          </button>
        </div>
      </div>

      {/* 2. "WHAT SHOULD I WORK ON RIGHT NOW?" — Core Intelligence Card */}
      {whatToWorkOnNow && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-zinc-950 to-violet-950/20 p-5 md:p-6 shadow-xl"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 border border-primary/30 text-primary-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  What to work on right now
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${whatToWorkOnNow.subjectColor}25`,
                    color: whatToWorkOnNow.subjectColor,
                  }}
                >
                  {whatToWorkOnNow.subjectName}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  ⏱️ {whatToWorkOnNow.recommendedMinutes} min recommended
                </span>
              </div>

              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {whatToWorkOnNow.title}
              </h3>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                {whatToWorkOnNow.reason}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={() => {
                  setFocusTask({
                    id: whatToWorkOnNow.taskId || whatToWorkOnNow.id,
                    title: whatToWorkOnNow.title,
                    subjectName: whatToWorkOnNow.subjectName,
                    subjectColor: whatToWorkOnNow.subjectColor,
                    subjectId: whatToWorkOnNow.subjectId,
                    estimatedMinutes: whatToWorkOnNow.recommendedMinutes,
                  });
                }}
                className="px-5 py-3 rounded-xl bg-white text-zinc-950 font-extrabold text-xs md:text-sm hover:bg-zinc-200 active:scale-95 transition shadow-lg flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>Start Focus Session</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. "LET'S RECOVER" — Overdue Reorganization Drawer */}
      {overdueItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 md:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Let's Recover
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                    {overdueItems.length} overdue
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  You fell slightly behind. Let's reorganize these items without the stress.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/5 space-y-2">
            {overdueItems.slice(0, 3).map((item: any) => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              return (
                <div key={item.id} className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">{item.title}</span>
                    <span className="text-[10px] text-amber-400">
                      Overdue by {item.daysOverdue} day{item.daysOverdue > 1 ? 's' : ''} ({item.subjectName})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        rescheduleMutation.mutate({
                          taskId: item.id,
                          date: tomorrow.toISOString(),
                        })
                      }
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold border border-white/10 transition"
                    >
                      Reschedule Tomorrow
                    </button>
                    <button
                      onClick={() => completeTaskMutation.mutate(item.id)}
                      className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 transition"
                    >
                      Mark Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 4. Semester Health Strip */}
      {semesterHealth.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Semester Health
            </h4>
            <span className="text-[11px] text-zinc-500">Subject progress & risks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {semesterHealth.map((subj: any) => {
              const isExpanded = expandedSubjectId === subj.id;
              const statusColor =
                subj.status === 'HEALTHY'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : subj.status === 'NEEDS_ATTENTION'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

              const statusIcon =
                subj.status === 'HEALTHY' ? '🟢' : subj.status === 'NEEDS_ATTENTION' ? '🟡' : '🔴';

              return (
                <div
                  key={subj.id}
                  onClick={() => setExpandedSubjectId(isExpanded ? null : subj.id)}
                  className={`p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border cursor-pointer transition flex flex-col justify-between ${statusColor.includes('border') ? statusColor : 'border-white/5'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subj.color }} />
                      <span className="text-xs font-bold text-white truncate">{subj.name}</span>
                    </div>
                    <span className="text-xs">{statusIcon}</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{subj.completionRate}% complete</span>
                    {subj.upcomingExamDays !== null && (
                      <span className="text-amber-400 font-semibold font-mono">
                        Exam in {subj.upcomingExamDays}d
                      </span>
                    )}
                  </div>

                  {/* Expanded Diagnostics */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-2.5 border-t border-white/5 space-y-1 text-[10px] text-zinc-400"
                      >
                        {subj.reasons.map((r: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-zinc-500" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Main Split: Daily Horizon (Left) & Workload / Habits (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Tasks & Horizon */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard hoverEffect={false} className="border-white/5">
            {/* Header Tabs */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('prioritized')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'prioritized'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Intelligent Priority
                </button>
                <button
                  onClick={() => setActiveTab('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'today'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Today ({todaysTasks.length})
                </button>
                <button
                  onClick={() => setActiveTab('deadlines')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'deadlines'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Deadlines ({upcomingAssignments.length})
                </button>
              </div>

              <button
                onClick={() => setActiveSection('Planner')}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span>Full Board</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List Content */}
            <div className="pt-4 divide-y divide-white/5 space-y-3">
              {activeTab === 'prioritized' && (
                prioritizedTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No active tasks pending. Click '+' to capture new work.
                  </div>
                ) : (
                  prioritizedTasks.slice(0, 6).map((task: any) => (
                    <div
                      key={task.id}
                      className="pt-3 first:pt-0 flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => completeTaskMutation.mutate(task.id)}
                          className="mt-0.5 w-4 h-4 rounded border border-white/20 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition shrink-0"
                        >
                          <CheckCircle2 className="w-3 h-3 text-transparent hover:text-emerald-400" />
                        </button>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white group-hover:text-primary transition block truncate">
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                            {task.calculatedPriority && (
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                  task.calculatedPriority === 'URGENT'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : task.calculatedPriority === 'HIGH'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-white/10 text-zinc-300'
                                }`}
                              >
                                {task.calculatedPriority}
                              </span>
                            )}
                            {task.subject && (
                              <span
                                className="px-1.5 py-0.2 rounded font-medium"
                                style={{
                                  backgroundColor: `${task.subject.color}20`,
                                  color: task.subject.color,
                                }}
                              >
                                {task.subject.name}
                              </span>
                            )}
                            <span className="text-zinc-500">· {task.priorityReason}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setFocusTask({
                            id: task.id,
                            title: task.title,
                            subjectName: task.subject?.name,
                            subjectColor: task.subject?.color,
                            subjectId: task.subjectId,
                            estimatedMinutes: task.estimatedMinutes || 25,
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-foreground text-[11px] font-semibold shrink-0"
                      >
                        Focus →
                      </button>
                    </div>
                  ))
                )
              )}

              {activeTab === 'today' && (
                todaysTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No tasks scheduled for today.
                  </div>
                ) : (
                  todaysTasks.map((task: any) => (
                    <div key={task.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">{task.title}</span>
                        <span className="text-[10px] text-zinc-400">{task.timeSlot} · {task.priorityReason || 'Today'}</span>
                      </div>
                      <button
                        onClick={() =>
                          setFocusTask({
                            id: task.id,
                            title: task.title,
                            subjectName: task.subject?.name,
                            subjectColor: task.subject?.color,
                            subjectId: task.subjectId,
                            estimatedMinutes: task.estimatedMinutes || 25,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
                      >
                        Start
                      </button>
                    </div>
                  ))
                )
              )}

              {activeTab === 'deadlines' && (
                upcomingAssignments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No upcoming assignment deadlines.
                  </div>
                ) : (
                  upcomingAssignments.map((ass: any) => (
                    <div key={ass.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">{ass.title}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          {ass.subject && (
                            <span style={{ color: ass.subject.color }} className="font-semibold">
                              {ass.subject.name}
                            </span>
                          )}
                          <span className="text-zinc-400">· {ass.priorityReason}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                        {new Date(ass.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))
                )
              )}
            </div>
          </GlassCard>

          {/* Study Progression Activity Chart */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Study Progression</h3>
                <p className="text-[11px] text-zinc-400">Weekly learning hours representation</p>
              </div>
              {studyHoursTrend >= 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{studyHoursTrend}% vs last week</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{studyHoursTrend}% vs last week</span>
                </div>
              )}
            </div>
            <StudyBarChart dailyStudyHours={dailyStudyHours} />
          </GlassCard>
        </div>

        {/* Right 1 Col: Workload Capacity, Upcoming Exams & Habits */}
        <div className="space-y-6">
          {/* Workload Capacity Meter */}
          {workloadMetrics && (
            <GlassCard hoverEffect={false} className="border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Weekly Workload
                </h4>
                <span className="text-xs font-mono font-bold text-white">
                  {workloadMetrics.totalHours}h / {workloadMetrics.capacityHours}h
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                <div
                  style={{ width: `${Math.min(100, workloadMetrics.loadPercentage)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    workloadMetrics.isOverloaded
                      ? 'bg-rose-500'
                      : workloadMetrics.loadPercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                {workloadMetrics.advice}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center text-[10px]">
                <div className="p-1.5 rounded bg-white/[0.02]">
                  <span className="text-zinc-500 block">Classes</span>
                  <span className="font-bold text-white">{workloadMetrics.classHours}h</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.02]">
                  <span className="text-zinc-500 block">Assignments</span>
                  <span className="font-bold text-white">{workloadMetrics.assignmentHours}h</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.02]">
                  <span className="text-zinc-500 block">Tasks</span>
                  <span className="font-bold text-white">{workloadMetrics.taskHours}h</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Upcoming Exams Countdown */}
          {upcomingExams.length > 0 && (
            <GlassCard hoverEffect={false} className="border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                  Upcoming Exams
                </h4>
                <button
                  onClick={() => setActiveSection('Calendar')}
                  className="text-[11px] text-primary hover:underline"
                >
                  View Calendar
                </button>
              </div>

              <div className="space-y-2.5">
                {upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{exam.title}</span>
                      <span className="text-[10px] text-zinc-400">
                        {exam.subject?.name || 'Academic Exam'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-amber-400 block font-mono">
                        {exam.daysAway === 0 ? 'TODAY' : `${exam.daysAway}d`}
                      </span>
                      <span className="text-[9px] text-zinc-500">remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Habit Tracker */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Daily Habits
              </h4>
              <button
                onClick={() => setActiveSection('Habits')}
                className="text-[11px] text-primary hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2">
              {habitStats.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-500">
                  No habits set yet. Track daily study routines!
                </div>
              ) : (
                habitStats.map((h: any) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-zinc-200">{h.name}</span>
                    <span className="text-[11px] font-mono text-primary font-bold">
                      {h.completions} / {h.target}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
