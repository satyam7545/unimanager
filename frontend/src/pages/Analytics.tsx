import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, FolderHeart, Activity, CheckSquare } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';

export const Analytics: React.FC = () => {
  // 1. Fetch statistics
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['analyticsStats'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-44 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white/5 rounded-2xl border border-white/5 md:col-span-2" />
          <div className="h-64 bg-white/5 rounded-2xl border border-white/5" />
          <div className="h-64 bg-white/5 rounded-2xl border border-white/5" />
          <div className="h-64 bg-white/5 rounded-2xl border border-white/5 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center border border-red-500/10 bg-red-500/5 rounded-xl">
        <h3 className="text-red-400 font-semibold text-lg">Error loading analytics</h3>
        <p className="text-sm text-zinc-500 mt-1">Failed to retrieve study metrics. Make sure backend is running.</p>
      </div>
    );
  }

  const {
    studyHours = [],
    assignments = { completed: 0, pending: 0, total: 0 },
    subjectPerformance = [],
    projectProgress = []
  } = statsData || {};

  // --- SVG Study Hours Area Graph computations ---
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  const maxHours = Math.max(...studyHours.map((d: any) => d.hours), 5); // baseline max height 5h

  // Compute coordinate points (x, y)
  const linePoints = studyHours.map((d: any, idx: number) => {
    const totalDays = studyHours.length - 1 || 1;
    const x = paddingX + (idx * (svgWidth - 2 * paddingX)) / totalDays;
    const y = svgHeight - paddingY - (d.hours / maxHours) * (svgHeight - 2 * paddingY);
    return { x, y, label: d.day, val: d.hours };
  });

  // Construct path definitions
  const pathD = linePoints.length > 0 
    ? `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // Gradient area definition (closing the path at the bottom x-axis)
  const areaD = linePoints.length > 0
    ? `${pathD} L ${linePoints[linePoints.length - 1].x} ${svgHeight - paddingY} L ${linePoints[0].x} ${svgHeight - paddingY} Z`
    : '';

  // --- Radial Assignment Donut calculation ---
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const totalAssignments = assignments.total || 0;
  const completedAssignments = assignments.completed || 0;
  const assRatio = totalAssignments > 0 ? completedAssignments / totalAssignments : 0;
  const strokeOffset = circumference - assRatio * circumference;

  return (
    <div className="space-y-8 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Academic Analytics</h2>
          <p className="text-sm text-zinc-400 mt-1">Visualize learning milestones, focus hour charts, and assignment counts.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md shrink-0">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-zinc-300 font-semibold">Real-time stats</span>
        </div>
      </div>

      {/* Analytics Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Study Focus Area Chart */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Study Focus Hours</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Aggregate hours from study sessions and planner checklists</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Weekly area graph</span>
              </div>
            </div>

            {/* Custom SVG Line Area Chart */}
            <div className="relative">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full overflow-visible">
                <defs>
                  {/* Glowing line wash gradient */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const y = paddingY + r * (svgHeight - 2 * paddingY);
                  return (
                    <line
                      key={i}
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.04)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Closed Area path */}
                {areaD && <path d={areaD} fill="url(#areaGrad)" />}

                {/* Line path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points glow nodes */}
                {linePoints.map((p: any, i: number) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      className="fill-primary stroke-zinc-950 stroke-2 hover:r-6 hover:fill-white transition-all"
                    />
                    {/* Tooltip hovering text */}
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      {p.val}h
                    </text>
                  </g>
                ))}

                {/* X-axis indicators */}
                {linePoints.map((p: any, i: number) => (
                  <text
                    key={i}
                    x={p.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-zinc-500 font-semibold"
                  >
                    {p.label}
                  </text>
                ))}
              </svg>
            </div>
          </GlassCard>
        </div>

        {/* 2. Assignments radial donut donut chart */}
        <GlassCard hoverEffect={false} className="border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">Assignments Done</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Ratio of homework completions</p>
          </div>

          {/* SVG Donut Progress ring */}
          <div className="flex items-center justify-center my-6 relative h-36">
            <svg className="w-28 h-28 transform -rotate-90">
              {/* Backing circle track */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="7.5"
              />
              {/* Colored progress line */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="transparent"
                stroke="hsl(var(--primary))"
                strokeWidth="7.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center percentage label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-white leading-none">
                {completedAssignments} / {totalAssignments}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1 tracking-wider">Completed</span>
            </div>
          </div>

          <div className="flex justify-around items-center border-t border-white/5 pt-4 text-xs font-semibold">
            <div className="text-center">
              <span className="text-zinc-500 block">Pending</span>
              <span className="text-sm font-bold text-red-400 mt-0.5 block">{assignments.pending}</span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="text-center">
              <span className="text-zinc-500 block">Completions</span>
              <span className="text-sm font-bold text-emerald-500 mt-0.5 block">{completedAssignments}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Statistics Performance split grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject performance completions bars */}
        <GlassCard hoverEffect={false} className="border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-white">Subject Progress Overview</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Completed homework items and checklist counts per course</p>
            </div>
            <CheckSquare className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="space-y-4">
            {subjectPerformance.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4">No tasks or assignments resolved to subjects.</p>
            ) : (
              subjectPerformance.map((subj: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-zinc-200 truncate">{subj.subject}</span>
                    <span className="text-zinc-400">{subj.completions} completions</span>
                  </div>
                  {/* Custom progress slider bar */}
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      style={{ 
                        width: `${Math.min((subj.completions / 10) * 100, 100)}%`, // scale completed items (e.g. 10 is max)
                        backgroundColor: subj.color 
                      }}
                      className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-300 shadow-inner opacity-80"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Project progress sliders */}
        <GlassCard hoverEffect={false} className="border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-white">Project Progress Summary</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Kanban complete percentages for coding repositories</p>
            </div>
            <FolderHeart className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="space-y-4">
            {projectProgress.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4">No active projects logged in Kanban boards.</p>
            ) : (
              projectProgress.map((proj: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-zinc-200 truncate">{proj.name}</span>
                    <span className="text-primary font-bold">{Math.round(proj.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      style={{ width: `${proj.progress}%` }}
                      className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
