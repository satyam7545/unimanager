import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';
import { useUIStore } from '@/store/uiStore';

export const Calendar: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedSemester } = useUIStore();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');

  // Event modal creation states
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [color, setColor] = useState('#3B82F6'); // default blue
  const [isAllDay, setIsAllDay] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  // Calculate dates for queries
  const getMonthDateRange = (date: Date) => {
    // Take buffer days around month boundary (e.g. 7 days before and after)
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    firstDay.setDate(firstDay.getDate() - 7);
    
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    lastDay.setDate(lastDay.getDate() + 7);
    
    return { start: firstDay.toISOString(), end: lastDay.toISOString() };
  };

  const { start, end } = getMonthDateRange(currentDate);

  // 1. Fetch unified calendar events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['calendarEvents', start, end, selectedSemester],
    queryFn: async () => {
      let url = `/calendar/events?start=${start}&end=${end}`;
      if (selectedSemester && selectedSemester !== 'all') {
        url += `&semester=${selectedSemester}`;
      }
      const res = await api.get(url);
      return res.data.events;
    },
  });

  // 2. Fetch subjects for custom event creation
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.subjects;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create event.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartAt('');
    setEndAt('');
    setColor('#3B82F6');
    setIsAllDay(false);
    setSubjectId('');
    setErrorMsg(null);
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleShiftMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const handleDateClick = (dateStr: string) => {
    resetForm();
    // Default time slot start 10:00 AM, end 11:00 AM on selected date
    const targetDate = new Date(dateStr);
    targetDate.setHours(10, 0, 0, 0);
    const startStr = targetDate.toISOString().slice(0, 16);
    
    targetDate.setHours(11, 0, 0, 0);
    const endStr = targetDate.toISOString().slice(0, 16);

    setStartAt(startStr);
    setEndAt(endStr);
    setShowModal(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: any) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt || !endAt) return;

    if (new Date(startAt) > new Date(endAt)) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    createMutation.mutate({
      title,
      description,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      color,
      isAllDay,
      subjectId: subjectId || null,
    });
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Delete this event?')) {
      deleteMutation.mutate(id);
    }
  };

  // --- Dynamic Calendar Matrix Math ---
  const getMonthDaysMatrix = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // day index of 1st day of month (0-6)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const matrix: { date: Date; isCurrentMonth: boolean }[] = [];

    // Fill preceding buffer days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      matrix.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Fill current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      matrix.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Fill succeeding buffer days to round grid cells (make 42 matrix blocks)
    const cellsRemaining = 42 - matrix.length;
    for (let i = 1; i <= cellsRemaining; i++) {
      matrix.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return matrix;
  };

  const daysMatrix = getMonthDaysMatrix();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8 select-none">
      {/* Header date switcher controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleShiftMonth(-1)}
            className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 justify-center sm:justify-start">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span>{currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Unified academic agenda matrix</p>
          </div>

          <button
            onClick={() => handleShiftMonth(1)}
            className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex border border-white/5 bg-white/[0.02] p-0.5 rounded-lg text-xs font-semibold text-zinc-400">
            {(['month', 'week', 'agenda'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                  viewMode === mode ? 'bg-primary/20 text-white shadow-inner' : 'hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              resetForm();
              // default to active day, start time now
              const now = new Date();
              setStartAt(now.toISOString().slice(0, 16));
              now.setHours(now.getHours() + 1);
              setEndAt(now.toISOString().slice(0, 16));
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 border border-white/5 bg-white/[0.01] rounded-2xl animate-pulse" />
      ) : viewMode === 'month' ? (
        /* --- 1. MONTH VIEW LAYOUT --- */
        <div className="border border-white/5 bg-zinc-950/20 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-white/5 bg-black/20 text-center py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0">
            {weekDays.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Matrix Cells */}
          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-white/5 border-l border-t border-transparent h-[60vh]">
            {daysMatrix.map(({ date, isCurrentMonth }, idx) => {
              const dateQueryKey = date.toISOString().slice(0, 10);
              
              // Filter events landing on this date (dates must match ISO days)
              const cellEvents = eventsData?.filter((ev: any) => {
                const eventDay = new Date(ev.start).toISOString().slice(0, 10);
                return eventDay === dateQueryKey;
              }) || [];

              return (
                <div
                  key={idx}
                  onClick={() => handleDateClick(date.toISOString())}
                  className={`p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:bg-white/[0.01] transition-colors relative min-h-[5.5rem] ${
                    isCurrentMonth ? 'bg-transparent' : 'bg-black/20 text-zinc-600'
                  }`}
                >
                  <span className={`text-xs font-bold block leading-none self-end ${
                    isCurrentMonth ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {date.getDate()}
                  </span>

                  {/* Pills Container */}
                  <div className="mt-1 flex-1 flex flex-col gap-1 overflow-y-auto max-h-[4.5rem]">
                    {cellEvents.map((ev: any) => (
                      <div
                        key={ev.id}
                        onClick={(e) => handleEventClick(e, ev)}
                        className="text-[9px] px-1.5 py-0.5 rounded font-extrabold truncate select-none border"
                        style={{
                          backgroundColor: `${ev.color}15`,
                          color: ev.color,
                          borderColor: `${ev.color}25`
                        }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'week' ? (
        /* --- 2. WEEK VIEW LAYOUT --- */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => {
            const startOfWeek = new Date(currentDate);
            // shift date to Sunday of the active week
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + i);
            const dateStr = startOfWeek.toISOString().slice(0, 10);
            
            const cellEvents = eventsData?.filter((ev: any) => {
              const eventDay = new Date(ev.start).toISOString().slice(0, 10);
              return eventDay === dateStr;
            }) || [];

            return (
              <div key={i} className="flex flex-col h-[55vh] space-y-3">
                <div className="border-b border-white/5 pb-2 text-center shrink-0">
                  <span className="text-xs text-zinc-500 font-bold block uppercase tracking-wider">{weekDays[i]}</span>
                  <span className="text-sm font-extrabold text-white block mt-0.5">{startOfWeek.getDate()}</span>
                </div>

                <div 
                  onClick={() => handleDateClick(startOfWeek.toISOString())}
                  className="flex-1 overflow-y-auto space-y-2 border border-dashed border-white/5 rounded-xl p-2 cursor-pointer bg-white/[0.005] hover:bg-white/[0.01] transition-colors"
                >
                  {cellEvents.length === 0 ? (
                    <span className="text-[10px] text-zinc-600 block text-center mt-4">Empty</span>
                  ) : (
                    cellEvents.map((ev: any) => (
                      <div
                        key={ev.id}
                        onClick={(e) => handleEventClick(e, ev)}
                        className="p-2 text-xs font-semibold rounded border block transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: `${ev.color}15`,
                          color: ev.color,
                          borderColor: `${ev.color}25`
                        }}
                      >
                        <span className="block truncate font-bold">{ev.title}</span>
                        {ev.type === 'EVENT' && !ev.isAllDay && (
                          <span className="text-[9px] opacity-75 block mt-1">
                            {new Date(ev.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- 3. AGENDA VIEW LAYOUT --- */
        <div className="max-w-2xl mx-auto space-y-4">
          {eventsData?.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              <p className="text-zinc-500 text-sm">No upcoming academic milestones mapped.</p>
            </div>
          ) : (
            eventsData?.map((ev: any) => (
              <GlassCard
                key={ev.id}
                hoverEffect={true}
                className="border-white/5 cursor-pointer flex items-center justify-between gap-4 !p-4"
                onClick={(e) => handleEventClick(e, ev)}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color }} />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200 block truncate">{ev.title}</h4>
                    {ev.description && <p className="text-xs text-zinc-500 truncate mt-0.5">{ev.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[9px] bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.5 rounded font-extrabold">
                        {ev.type}
                      </span>
                      {ev.subjectName && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${ev.subjectColor}15`, color: ev.subjectColor }}>
                          ● {ev.subjectName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{new Date(ev.start).toLocaleDateString()}</span>
                  </span>
                  {!ev.isAllDay && (
                    <span className="text-[10px] text-zinc-500 block mt-1">
                      {new Date(ev.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Custom Event Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Create Calendar Event</h3>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Event Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., OS Midterm Review"
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Classroom 204 notes"
                  className="w-full h-16 p-3 rounded-lg text-sm text-white glass-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Time</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject Scope</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="">None</option>
                    {subjects?.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tag Color</label>
                  <div className="flex items-center gap-1.5 h-10">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          color === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
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

      {/* Event Details Overlay Dialog */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: selectedEvent.color }} />
                <h3 className="text-lg font-bold text-white leading-tight truncate">{selectedEvent.title}</h3>
              </div>
              <span className="text-[9px] bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide shrink-0">
                {selectedEvent.type}
              </span>
            </div>

            {selectedEvent.description && (
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed border-t border-white/5 pt-3">
                {selectedEvent.description}
              </p>
            )}

            <div className="space-y-2 mt-4 pt-3 border-t border-white/5 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Starts: {new Date(selectedEvent.start).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Ends: {new Date(selectedEvent.end).toLocaleString()}</span>
              </div>
              {selectedEvent.subjectName && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span>Subject: {selectedEvent.subjectName}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-5 mt-2 border-t border-white/5">
              <button
                onClick={resetForm}
                className="flex-1 h-9 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
              >
                Close
              </button>
              {selectedEvent.type === 'EVENT' && (
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="flex-1 h-9 rounded-lg border border-red-500/10 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Event</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
