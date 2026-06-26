import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Flame,
  CheckSquare,
  Clock,
  Award,
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BookOpen
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '../features/auth/store/authStore';
import { GlassCard } from '@/components/GlassCard';
import { useUIStore } from '@/store/uiStore';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedSemester } = useUIStore();

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
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-10 w-64 bg-white/5 rounded-lg" />
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
        {/* Skeleton layout splits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-white/5 rounded-xl border border-white/5" />
            <div className="h-64 bg-white/5 rounded-xl border border-white/5" />
          </div>
          <div className="h-96 bg-white/5 rounded-xl border border-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center border border-red-500/10 bg-red-500/5 rounded-xl">
        <h3 className="text-red-400 font-semibold text-lg">Error loading dashboard</h3>
        <p className="text-sm text-zinc-500 mt-1">Failed to retrieve data summary. Make sure backend is running.</p>
      </div>
    );
  }

  const {
    studyStreak = 0,
    todaysTasks = [],
    upcomingAssignments = [],
    weeklyStudyHours = 0,
    productivityScore = 100,
    recentProjects = [],
    studyHoursTrend = 0,
    dailyStudyHours = []
  } = summary || {};

  return (
    <div className="space-y-8 select-none">
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, {user?.name || 'Student'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Here is a summary of your academic workspace for today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md shrink-0">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-zinc-300 font-semibold">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Highlights Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={item}>
          <GlassCard className="flex items-center gap-4 border-white/5">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
              <Flame className="w-6 h-6 fill-orange-500" />
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-400">Study Streak</span>
              <h3 className="text-xl font-bold text-orange-500 leading-none mt-1">{studyStreak} Days</h3>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="flex items-center gap-4 border-white/5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-400">Tasks Pending</span>
              <h3 className="text-xl font-bold text-white leading-none mt-1">{todaysTasks.length} Tasks</h3>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="flex items-center gap-4 border-white/5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-400">Weekly Study Hours</span>
              <h3 className="text-xl font-bold text-white leading-none mt-1">{weeklyStudyHours} hrs</h3>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="flex items-center gap-4 border-white/5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-400">Productivity Score</span>
              <h3 className="text-xl font-bold text-emerald-500 leading-none mt-1">{productivityScore}%</h3>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (Tasks) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Today's Checklists</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Tasks scheduled or in progress</p>
              </div>
              <button className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                <span>View Planner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/5 space-y-3.5">
              {todaysTasks.length === 0 ? (
                <p className="text-sm text-zinc-500 py-2">No tasks due today. Hooray!</p>
              ) : (
                todaysTasks.map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3.5 pt-3.5 first:pt-0 group">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={task.status === 'DONE'}
                        readOnly
                        className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-zinc-950 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate text-zinc-200 group-hover:text-white">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {task.priority && (
                          <span className="text-[9px] bg-white/5 border border-white/10 text-zinc-400 px-1 py-0.5 rounded font-semibold uppercase">
                            {task.priority}
                          </span>
                        )}
                        {task.project && (
                          <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1 py-0.5 rounded font-semibold">
                            📁 {task.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Productivity progress visual */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Study Progression</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Weekly learning hours representation</p>
              </div>
              {studyHoursTrend >= 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-pulse">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{studyHoursTrend}% vs last week</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{studyHoursTrend}% vs last week</span>
                </div>
              )}
            </div>

            {/* Visual graph representation using divs */}
            <div className="h-48 flex items-end justify-between gap-2.5 pt-4">
              {dailyStudyHours.length === 0 ? (
                [
                  { day: 'Mon', hrs: 0 },
                  { day: 'Tue', hrs: 0 },
                  { day: 'Wed', hrs: 0 },
                  { day: 'Thu', hrs: 0 },
                  { day: 'Fri', hrs: 0 },
                  { day: 'Sat', hrs: 0 },
                  { day: 'Sun', hrs: 0 }
                ].map((bar) => (
                  <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {bar.hrs}h
                    </span>
                    <div
                      style={{ height: '5%' }}
                      className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-lg shadow-primary/10"
                    />
                    <span className="text-xs text-zinc-500">{bar.day}</span>
                  </div>
                ))
              ) : (
                (() => {
                  const maxHrs = Math.max(...dailyStudyHours.map((d: any) => d.hrs), 1);
                  return dailyStudyHours.map((bar: any) => {
                    const heightPercent = `${Math.max(5, Math.round((bar.hrs / maxHrs) * 80))}%`;
                    return (
                      <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {bar.hrs}h
                        </span>
                        <div
                          style={{ height: heightPercent }}
                          className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-lg shadow-primary/10"
                        />
                        <span className="text-xs text-zinc-500">{bar.day}</span>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column (Upcoming Deadlines & Recent Projects) */}
        <div className="space-y-6">
          <GlassCard hoverEffect={false} className="border-white/5">
            <h3 className="font-bold text-lg text-white mb-4">Upcoming Deadlines</h3>
            <div className="space-y-4">
              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-zinc-500">No upcoming assignments or tests.</p>
              ) : (
                upcomingAssignments.map((dl: any) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-semibold text-zinc-200 block truncate">{dl.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold shrink-0 ${
                          dl.priority === 'HIGH' || dl.priority === 'URGENT'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'bg-zinc-500/10 border border-zinc-500/20 text-zinc-400'
                        }`}
                      >
                        {dl.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(dl.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      {dl.subject && (
                        <span className="text-[10px] ml-auto" style={{ color: dl.subject.color }}>
                          ● {dl.subject.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Recent projects shortcuts */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <h3 className="font-bold text-lg text-white mb-4">Recent Projects</h3>
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <p className="text-sm text-zinc-500">No active projects found.</p>
              ) : (
                recentProjects.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between p-2 hover:bg-white/[0.02] rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-white block truncate">
                          {proj.name}
                        </span>
                        <span className="text-xs text-zinc-500 block truncate">{proj.description || 'No description'}</span>
                      </div>
                    </div>
                    <BookOpen className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
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
